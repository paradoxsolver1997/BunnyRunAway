# 🐰 Bunny Runaway Web

An open-source and modular JavaScript game project featuring intelligent pathfinding and a modern UI. This repository is intended for developers and learners interested in game architecture, AI, and browser-based game development.

### Links

- Simply try out the game at: [`https://bunny.paradoxsolver.com/`](https://bunny.paradoxsolver.com/).

- Read [`docs/README.md`](docs/README.md) and [`docs/tutorial.html`](docs/tutorial.html) for how to play, or refer to the online tutorial within the game.

- Download the executable version at: [`https://paradoxsolver.itch.io/bunny-runaway`](https://paradoxsolver.itch.io/bunny-runaway).

- Trailer: [`https://www.youtube.com/watch?v=MiFMS1bnBFE`](https://www.youtube.com/watch?v=MiFMS1bnBFE)
## 🎯 Project Highlights

- **AI Pathfinding**: A* algorithm for smart bunny movement
- **Responsive Design**: Works across devices and browsers
- **Modular Codebase**: Clean, maintainable, and extensible structure
- **Modern UI**: Attractive interface and smooth user experience

## Requirements

- Any modern web browser (Chrome, Firefox, Edge, Safari, etc.)
- Interpreter, one of the following two:
    - Python 3.x (recommended for running a simple local server with `python -m http.server`)
    - Node.js (optional, only if you want to use npm-based static servers or install dependencies)
- No build tools or package managers are required for basic development and running the game
- No JavaScript framework knowledge is needed; the project uses plain JavaScript (ES6+)
- If you want to modify or extend the code, a basic understanding of JavaScript modules and browser developer tools is helpful

## 🚀 Getting Started

### Development Environment

You can run the game locally using any static file server. For example:

```bash
# Start a development server (Node.js required)
python -m http.server 8000
# or
npm install -g serve
serve .

# Then open
# http://localhost:8000/index.html
```

## 📁 Project Structure

```
BunnyRunAway/
├── src/                          # Source code
│   ├── app.js                    # Application entry point
│   ├── core/                     # Core game systems
│   │   ├── GameController.js     # Game controller
│   │   ├── GameEngine.js         # Game engine
│   │   ├── GameLoop.js           # Game loop
│   │   ├── UIManager.js          # UI manager
│   │   ├── EventHandler.js       # Event handler
│   │   └── ...
│   ├── managers/                 # Managers
│   │   ├── GameInitializer.js    # Game initializer
│   │   ├── ConfigManager.js      # Configuration manager
│   │   ├── AudioManager.js       # Audio manager
│   │   ├── DialogManager.js      # Dialog manager
│   │   └── ...
│   ├── services/                 # Game services
│   │   ├── Bunny.js              # Bunny AI
│   │   ├── MapService.js         # Map service
│   │   ├── BlockerService.js     # Blocker service
│   │   ├── DocumentationService.js # Documentation service
│   │   └── ...
│   └── utils/                    # Utilities
│       ├── CanvasRenderer.js     # Canvas renderer
│       ├── CanvasCoordinateHelper.js # Coordinate helper
│       ├── responsive-helper.js  # Responsive helper
│       └── ...
├── css/                          # Stylesheets
│   ├── main.css                  # Main styles
│   ├── components.css             # 组件样式
│   ├── dialogs.css                # 对话框样式
│   └── responsive.css              # 响应式样式
├── assets/                        # 静态资源
│   ├── maps/                      # 地图数据
│   │   ├── easy/                  # 简单难度地图
│   │   └── hard/                  # 困难难度地图
│   ├── backgrounds/               # 背景图片
│   ├── sprites/                   # 精灵图片
│   ├── tiles/                     # 瓦片图片
│   ├── sound/                     # 音频文件
│   └── fonts/                     # 字体文件
├── config.json                    # 游戏参数配置
├── docs/                          # 文档
│   ├── README.md                  # 项目文档
│   ├── tutorial.html              # 教程页面
│   ├── components.css             # Component styles
│   ├── dialogs.css                # Dialog styles
│   └── responsive.css             # Responsive styles
├── assets/                        # Static assets
│   ├── maps/                      # Map data (easy/hard)
│   ├── backgrounds/               # Background images
│   ├── sprites/                   # Sprites
│   ├── tiles/                     # Tiles
│   ├── sound/                     # Audio files
│   └── fonts/                     # Fonts
├── config.json                    # Game configuration
├── docs/                          # Documentation (see below)
│   ├── README.md                  # Detailed docs
│   ├── tutorial.html              # Tutorial
│   ├── credits.html               # Credits
├── index.html                     # Main entry point
├── package.json                   # Project config
└── ReadMe.md                      # This file
```

## 🎮 Game Features

### Core Gameplay
- **Intelligent Bunny AI**: A* pathfinding
- **Strategic Play**: Place blockers to prevent the bunny from escaping
- **Multiple Levels**: 30 easy + 30 hard maps
- **Real-time Feedback**: Dynamic path visualization

### Technical Features
- **Pure JavaScript**: No external dependencies required
- **Modular Architecture**: Easy to maintain and extend
- **Responsive Design**: Adapts to all screen sizes
- **Modern UI**: Smooth animations and user-friendly interface

## 🛠️ Developer Guide

### Architecture Overview

#### Core Modules (`src/core/`)
- **GameController**: Main game controller, coordinates systems
- **GameEngine**: Game logic engine
- **UIManager**: UI management
- **EventHandler**: Global event management

#### Managers (`src/managers/`)
- **GameInitializer**: Game initialization
- **ConfigManager**: Centralized configuration
- **AudioManager**: Music and sound
- **DialogManager**: Dialogs and popups

#### Services (`src/services/`)
- **Bunny**: AI and pathfinding
- **MapService**: Map data and logic
- **BlockerService**: Blocker management
- **DocumentationService**: Documentation loading
  
## 📊 Technology Stack

### Frontend
- **JavaScript ES6+** - Modern JavaScript
- **Canvas API** - 2D rendering
- **ES6 Modules** - Modular development
- **CSS3** - Modern styles and animation

### Algorithms
- **A\* Algorithm** - Pathfinding
- **Graph Theory** - Map and blocker logic
- **State Machine** - Game state management

## 🎨 Game Interface

### Main UI
- **Game Canvas**: 900x600px play area
- **Info Panel**: Game state and controls
- **Map Controls**: Difficulty and map selection
- **Game Controls**: Start, pause, stop

### Dialog System
- **Tutorial Dialog**: Gameplay instructions
- **About Dialog**: Game info
- **Credits Dialog**: Developer info
- **License Dialog**: Terms of use

## 🐛 Troubleshooting

### Common Issues

- **Game does not start**: Check browser console for JavaScript errors; verify resource paths and module imports.
- **Audio does not play**: Most browsers require user interaction before playing audio. Click the game area first.
- **Map loading fails**: Ensure `assets/maps/` exists and JSON files are valid.

### Debug Tools

In the browser console:
```javascript
tutorialCommands.status()   // Check tutorial status
tutorialCommands.restart()  // Restart tutorial
tutorialCommands.help()     // Show help
```

## 📝 Development Guidelines

### Code Style
- Use ES6+ syntax
- Modular development
- Clear comments and documentation
- Consistent naming conventions

### File Organization
- Group by feature/folder
- Keep structure clear
- Avoid circular dependencies

## 📄 License

GPL3 - see [LICENSE](LICENSE)

## 🤝 Contributing

Contributions are welcome! Please open issues or pull requests.

## 📚 Documentation

For more details, see the [`docs/`](docs/) folder, including [`docs/README.md`](docs/README.md) and [`docs/tutorial.html`](docs/tutorial.html).

---

**🎉 Enjoy the game!**