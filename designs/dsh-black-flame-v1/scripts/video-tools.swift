import Foundation
import AVFoundation
import AppKit

// 用法：
//   裁切   swiftc video-tools.swift -o video-tools && ./video-tools trim <in> <out> <endSeconds> <fadeSeconds>
//   抽帧   ./video-tools frame <in> <out.png> <t>
//   压缩   ./video-tools compress <in> <out.mp4> <start> <duration>   （1280×720）
let args = CommandLine.arguments
if args.count >= 6 && args[1] == "compress" {
    let asset = AVURLAsset(url: URL(fileURLWithPath: args[2]))
    let outURL = URL(fileURLWithPath: args[3])
    try? FileManager.default.removeItem(at: outURL)
    let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPreset1280x720)!
    session.outputURL = outURL
    session.outputFileType = .mp4
    session.timeRange = CMTimeRange(start: CMTime(seconds: Double(args[4])!, preferredTimescale: 600),
                                    duration: CMTime(seconds: Double(args[5])!, preferredTimescale: 600))
    session.shouldOptimizeForNetworkUse = true
    let sem = DispatchSemaphore(value: 0)
    session.exportAsynchronously { sem.signal() }
    sem.wait()
    if session.status != .completed { print("compress failed:", session.error?.localizedDescription ?? "unknown"); exit(1) }
    let size = ((try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size]) as? Int) ?? 0
    print("compress ok", size / 1024, "KB")
    exit(0)
}
if args.count >= 5 && args[1] == "frame" {
    let asset = AVURLAsset(url: URL(fileURLWithPath: args[2]))
    let gen = AVAssetImageGenerator(asset: asset)
    gen.appliesPreferredTrackTransform = true
    gen.requestedTimeToleranceBefore = .zero
    gen.requestedTimeToleranceAfter = .zero
    let cg = try gen.copyCGImage(at: CMTime(seconds: Double(args[4])!, preferredTimescale: 600), actualTime: nil)
    let rep = NSBitmapImageRep(cgImage: cg)
    try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[3]))
    print("frame ok", cg.width, cg.height)
    exit(0)
}
guard args.count >= 6, args[1] == "trim" else { print("usage: video-tools trim <in> <out> <end> <fade> | frame <in> <out.png> <t>"); exit(2) }
let inURL = URL(fileURLWithPath: args[2])
let outURL = URL(fileURLWithPath: args[3])
let end = Double(args[4])!
let fade = Double(args[5])!
try? FileManager.default.removeItem(at: outURL)

let asset = AVURLAsset(url: inURL)
let comp = AVMutableComposition()
let range = CMTimeRange(start: .zero, duration: CMTime(seconds: end, preferredTimescale: 600))

var audioTrack: AVMutableCompositionTrack?
for track in asset.tracks(withMediaType: .video) {
    let t = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
    try t.insertTimeRange(range, of: track, at: .zero)
    t.preferredTransform = track.preferredTransform
}
for track in asset.tracks(withMediaType: .audio) {
    let t = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
    try t.insertTimeRange(range, of: track, at: .zero)
    audioTrack = t
}

var audioMix: AVMutableAudioMix?
if let at = audioTrack, fade > 0 {
    let params = AVMutableAudioMixInputParameters(track: at)
    params.setVolumeRamp(fromStartVolume: 1.0, toEndVolume: 0.0,
                         timeRange: CMTimeRange(start: CMTime(seconds: end - fade, preferredTimescale: 600),
                                                duration: CMTime(seconds: fade, preferredTimescale: 600)))
    let mix = AVMutableAudioMix()
    mix.inputParameters = [params]
    audioMix = mix
}

let session = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetHighestQuality)!
session.outputURL = outURL
session.outputFileType = .mp4
session.audioMix = audioMix
session.shouldOptimizeForNetworkUse = true

let sem = DispatchSemaphore(value: 0)
session.exportAsynchronously { sem.signal() }
sem.wait()

if session.status != .completed {
    print("export failed:", session.error?.localizedDescription ?? "unknown")
    exit(1)
}
let outAsset = AVURLAsset(url: outURL)
print("done duration=\(CMTimeGetSeconds(outAsset.duration)) size=\(((try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size]) as? Int) ?? 0)")
