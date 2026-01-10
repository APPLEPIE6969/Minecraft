# Minecraft-Like Game

A web-based Minecraft-like game built with Three.js, featuring terrain generation, block building, inventory management, crafting, and multiplayer support.

## Features

- **Minecraft-like Terrain Generation**: Biomes (Plains, Desert, Snow, Jungle), caves, and ore generation
- **Comprehensive Block System**: Grass, Dirt, Stone, Wood, Leaves, Ores (Coal, Iron, Diamond), Bedrock
- **Block Breaking**: Mining progress with tool efficiency and correct item drops
- **Realistic Physics**: Gravity, jumping, sprinting, sneaking with AABB collision detection
- **Full Inventory System**: 9-slot hotbar and 27-slot inventory grid
- **Crafting System**: Recipes for planks, sticks, tools, and more
- **Day/Night Cycle**: Dynamic lighting and sky color changes
- **Tool System**: Pickaxes, axes, swords with durability and mining efficiency
- **Multiplayer Support**: Socket.IO for real-time player synchronization

## Controls

- **WASD** - Move
- **SPACE** - Jump
- **SHIFT** - Sprint
- **CTRL** - Sneak
- **Left Click** - Break Block
- **Right Click** - Place Block
- **E** - Open Inventory/Crafting
- **1-9** - Select Hotbar Slot
- **Scroll** - Switch Items

## Installation

```bash
npm install
```

## Running Locally

```bash
npm start
```

The game will be available at `http://localhost:3000`

## Deploying to Render

### Option 1: Using render.yaml (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New +" and select "Web Service"
4. Connect your repository
5. Render will automatically detect the `render.yaml` file and configure the service

### Option 2: Manual Configuration

1. Push your code to a Git repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New +" and select "Web Service"
4. Connect your repository
5. Configure:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or your preferred plan)

### Environment Variables

No additional environment variables are required. The server automatically uses `process.env.PORT` provided by Render.

## Project Structure

```
├── index.html          # Main HTML file
├── server.js           # Express server with Socket.IO
├── package.json        # Dependencies and scripts
├── render.yaml         # Render deployment configuration
└── src/
    ├── game.js         # Main game logic
    ├── world.js        # World generation and chunk management
    ├── inventory.js    # Inventory system
    ├── items.js        # Item definitions and crafting recipes
    ├── textures.js     # Block texture generation
    ├── mobs.js         # Mob AI and management
    └── minimap.js      # Minimap rendering
```

## Technologies Used

- **Three.js** - 3D graphics rendering
- **Express** - Web server
- **Socket.IO** - Real-time multiplayer communication
- **Simplex Noise** - Procedural terrain generation

## License

MIT
