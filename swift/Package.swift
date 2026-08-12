// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ZyxxyzChess",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "ChessEngine", targets: ["ChessEngine"]),
        .executable(name: "ChessApp", targets: ["ChessApp"])
    ],
    targets: [
        .target(name: "ChessEngine", path: "Sources/ChessEngine"),
        .executableTarget(name: "ChessApp", dependencies: ["ChessEngine"], path: "Sources/ChessApp"),
        .testTarget(name: "ChessEngineTests", dependencies: ["ChessEngine"], path: "Tests/ChessEngineTests")
    ]
)
