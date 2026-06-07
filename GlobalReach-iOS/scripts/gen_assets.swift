import AppKit
import CoreGraphics
import Foundation

// Brand colors
let red = NSColor(srgbRed: 0xef/255.0, green: 0x44/255.0, blue: 0x44/255.0, alpha: 1)   // #ef4444
let teal = NSColor(srgbRed: 0x14/255.0, green: 0xb8/255.0, blue: 0xa6/255.0, alpha: 1)  // #14b8a6

let iconDir = CommandLine.arguments[1]
let launchDir = CommandLine.arguments[2]

func makeContext(_ size: Int) -> CGContext {
    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    return CGContext(data: nil, width: size, height: size,
                     bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                     bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
}

func writePNG(_ image: CGImage, to path: String) {
    let rep = NSBitmapImageRep(cgImage: image)
    let data = rep.representation(using: .png, properties: [:])!
    try! data.write(to: URL(fileURLWithPath: path))
}

func drawGradient(_ ctx: CGContext, w: Int, h: Int, start: CGPoint, end: CGPoint) {
    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    let colors = [red.cgColor, teal.cgColor] as CFArray
    let grad = CGGradient(colorsSpace: cs, colors: colors, locations: [0, 1])!
    ctx.drawLinearGradient(grad, start: start, end: end, options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
}

// ---- App icon: diagonal gradient + "GR" centered, white bold ----
func makeIcon(_ size: Int, text: String) -> CGImage {
    let ctx = makeContext(size)
    let s = CGFloat(size)
    // diagonal top-left (red) -> bottom-right (teal). CG origin is bottom-left.
    drawGradient(ctx, w: size, h: size, start: CGPoint(x: 0, y: s), end: CGPoint(x: s, y: 0))

    // Draw text via NSAttributedString into the CG context
    let nsImage = NSImage(size: NSSize(width: s, height: s))
    nsImage.lockFocusFlipped(false)
    let gctx = NSGraphicsContext.current!.cgContext
    drawGradient(gctx, w: size, h: size, start: CGPoint(x: 0, y: s), end: CGPoint(x: s, y: 0))
    let fontSize = s * 0.42
    let font = NSFont.systemFont(ofSize: fontSize, weight: .heavy)
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.18)
    shadow.shadowBlurRadius = s * 0.02
    shadow.shadowOffset = NSSize(width: 0, height: -s * 0.012)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor.white,
        .shadow: shadow
    ]
    let str = NSAttributedString(string: text, attributes: attrs)
    let textSize = str.size()
    let pt = NSPoint(x: (s - textSize.width)/2, y: (s - textSize.height)/2)
    str.draw(at: pt)
    nsImage.unlockFocus()

    var rect = CGRect(x: 0, y: 0, width: s, height: s)
    return nsImage.cgImage(forProposedRect: &rect, context: nil, hints: nil)!
}

// iPhone icon sizes (unique pixel sizes)
let sizes = [40, 58, 60, 80, 87, 120, 167, 152, 76, 1024, 180]
for sz in Set(sizes) {
    let img = makeIcon(sz, text: "GR")
    writePNG(img, to: "\(iconDir)/icon-\(sz).png")
    print("icon-\(sz).png")
}

// ---- Launch background: vertical gradient red(top)->teal(bottom) ----
func makeLaunch(w: Int, h: Int, scaleLabel: Bool) -> CGImage {
    let nsImage = NSImage(size: NSSize(width: w, height: h))
    nsImage.lockFocusFlipped(false)
    let gctx = NSGraphicsContext.current!.cgContext
    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    let colors = [red.cgColor, teal.cgColor] as CFArray
    let grad = CGGradient(colorsSpace: cs, colors: colors, locations: [0, 1])!
    // top is red. CG origin bottom-left, so start at top (y=h) red, end bottom (y=0) teal
    gctx.drawLinearGradient(grad, start: CGPoint(x: CGFloat(w)/2, y: CGFloat(h)), end: CGPoint(x: CGFloat(w)/2, y: 0), options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
    nsImage.unlockFocus()
    var rect = CGRect(x: 0, y: 0, width: w, height: h)
    return nsImage.cgImage(forProposedRect: &rect, context: nil, hints: nil)!
}

// Generate @1x @2x @3x portrait gradient backgrounds (base 430x932 = iPhone 14 Pro Max pts)
let baseW = 430, baseH = 932
for scale in [1, 2, 3] {
    let img = makeLaunch(w: baseW*scale, h: baseH*scale, scaleLabel: false)
    let suffix = scale == 1 ? "" : "@\(scale)x"
    writePNG(img, to: "\(launchDir)/launch-bg\(suffix).png")
    print("launch-bg\(suffix).png")
}
print("DONE")
