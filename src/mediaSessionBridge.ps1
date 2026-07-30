# mediaSessionBridge.ps1
# Interface PowerShell WinRT pour Windows System Media Transport Controls (SMTC)

Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionTimelineProperties, Windows.Media.Control, ContentType = WindowsRuntime]

$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

$asStreamMethod = ([System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsStreamForRead' -and $_.GetParameters().Count -eq 1
})[0]

function Await-Operation($asyncOp, $targetType) {
    if (-not $asyncOp) { return $null }
    $genericMethod = $asTask.MakeGenericMethod($targetType)
    $task = $genericMethod.Invoke($null, @($asyncOp))
    $task.Wait()
    return $task.Result
}

try {
    $op = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $manager = Await-Operation $op ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

    if (-not $manager) {
        @{ connected = $false; reason = "No manager" } | ConvertTo-Json -Compress
        exit
    }

    $session = $manager.GetCurrentSession()
    if (-not $session) {
        @{ connected = $false; reason = "No active media session" } | ConvertTo-Json -Compress
        exit
    }

    $action = $args[0]
    if ($action -eq "playpause") {
        $op = $session.TryTogglePlayPauseAsync()
        $res = Await-Operation $op ([bool])
        @{ success = $res } | ConvertTo-Json -Compress
        exit
    } elseif ($action -eq "next") {
        $op = $session.TrySkipNextAsync()
        $res = Await-Operation $op ([bool])
        @{ success = $res } | ConvertTo-Json -Compress
        exit
    } elseif ($action -eq "previous") {
        $op = $session.TrySkipPreviousAsync()
        $res = Await-Operation $op ([bool])
        @{ success = $res } | ConvertTo-Json -Compress
        exit
    }

    $propOp = $session.TryGetMediaPropertiesAsync()
    $props = Await-Operation $propOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $info = $session.GetPlaybackInfo()

    $timeline = $session.GetTimelineProperties()
    $position = 0
    $duration = 0
    $lastUpdated = $null

    if ($timeline) {
        $position = $timeline.Position.TotalSeconds
        $duration = $timeline.EndTime.TotalSeconds
        $lastUpdated = $timeline.LastUpdatedTime.ToString("o")
    }

    $artBase64 = $null
    if ($props.Thumbnail) {
        try {
            $streamOp = $props.Thumbnail.OpenReadAsync()
            $stream = Await-Operation $streamOp ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
            if ($stream) {
                $netStream = $asStreamMethod.Invoke($null, @($stream))
                $memStream = New-Object System.IO.MemoryStream
                $netStream.CopyTo($memStream)
                $bytes = $memStream.ToArray()
                $artBase64 = [System.Convert]::ToBase64String($bytes)
            }
        } catch {
            $artBase64 = $null
        }
    }

    $statusStr = $info.PlaybackStatus.ToString()
    $isPlaying = ($statusStr -eq "Playing" -or $statusStr -eq "4")

    @{
        connected = $true
        source = $session.SourceAppUserModelId
        title = $props.Title
        artist = $props.Artist
        album = $props.AlbumTitle
        isPlaying = $isPlaying
        position = $position
        duration = $duration
        lastUpdated = $lastUpdated
        artwork = $artBase64
    } | ConvertTo-Json -Compress
} catch {
    @{ connected = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
}
