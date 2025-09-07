// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ScreentimeAgent",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "ScreentimeAgent", targets: ["App"])
    ],
    targets: [
        .executableTarget(
            name: "App",
            path: "Sources/App",
            resources: [
                .process("Resources/Info.plist")
            ]
        )
    ]
)

