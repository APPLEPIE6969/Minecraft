// Comprehensive Minecraft-like items
export const ITEMS = {
    // Blocks
    DIRT: { id: 1, name: "Dirt", icon: "🟫", placeable: true, mat: 'DIRT', stackSize: 64 },
    GRASS_BLOCK: { id: 2, name: "Grass Block", icon: "🟩", placeable: true, mat: 'GRASS', stackSize: 64 },
    STONE: { id: 3, name: "Stone", icon: "⬜", placeable: true, mat: 'STONE', stackSize: 64 },
    COBBLESTONE: { id: 4, name: "Cobblestone", icon: "⬜", placeable: true, mat: 'STONE', stackSize: 64 },
    WOOD: { id: 5, name: "Oak Log", icon: "🪵", placeable: true, mat: 'WOOD', stackSize: 64 },
    PLANKS: { id: 6, name: "Oak Planks", icon: "🟫", placeable: true, mat: 'WOOD', stackSize: 64 },
    LEAVES: { id: 7, name: "Leaves", icon: "🍃", placeable: true, mat: 'LEAF', stackSize: 64 },
    SAND: { id: 8, name: "Sand", icon: "🟨", placeable: true, mat: 'DIRT', stackSize: 64 },
    GRAVEL: { id: 9, name: "Gravel", icon: "⬛", placeable: true, mat: 'STONE', stackSize: 64 },
    COAL_ORE: { id: 10, name: "Coal Ore", icon: "⛏️", placeable: true, mat: 'COAL', stackSize: 64 },
    IRON_ORE: { id: 11, name: "Iron Ore", icon: "⛏️", placeable: true, mat: 'IRON', stackSize: 64 },
    DIAMOND_ORE: { id: 12, name: "Diamond Ore", icon: "💎", placeable: true, mat: 'DIAMOND', stackSize: 64 },
    
    // Materials
    COAL: { id: 20, name: "Coal", icon: "⚫", placeable: false, stackSize: 64 },
    IRON_INGOT: { id: 21, name: "Iron Ingot", icon: "🔩", placeable: false, stackSize: 64 },
    DIAMOND: { id: 22, name: "Diamond", icon: "💎", placeable: false, stackSize: 64 },
    STICK: { id: 23, name: "Stick", icon: "🥢", placeable: false, stackSize: 64 },
    
    // Tools
    WOODEN_PICKAXE: { id: 30, name: "Wooden Pickaxe", icon: "⛏️", placeable: false, tool: true, durability: 59, efficiency: 1.0, stackSize: 1 },
    STONE_PICKAXE: { id: 31, name: "Stone Pickaxe", icon: "⛏️", placeable: false, tool: true, durability: 131, efficiency: 2.0, stackSize: 1 },
    IRON_PICKAXE: { id: 32, name: "Iron Pickaxe", icon: "⛏️", placeable: false, tool: true, durability: 250, efficiency: 4.0, stackSize: 1 },
    DIAMOND_PICKAXE: { id: 33, name: "Diamond Pickaxe", icon: "⛏️", placeable: false, tool: true, durability: 1561, efficiency: 8.0, stackSize: 1 },
    
    WOODEN_AXE: { id: 40, name: "Wooden Axe", icon: "🪓", placeable: false, tool: true, durability: 59, efficiency: 1.0, stackSize: 1 },
    STONE_AXE: { id: 41, name: "Stone Axe", icon: "🪓", placeable: false, tool: true, durability: 131, efficiency: 2.0, stackSize: 1 },
    
    WOODEN_SWORD: { id: 50, name: "Wooden Sword", icon: "⚔️", placeable: false, tool: true, durability: 59, damage: 4, stackSize: 1 },
    STONE_SWORD: { id: 51, name: "Stone Sword", icon: "⚔️", placeable: false, tool: true, durability: 131, damage: 5, stackSize: 1 },
    IRON_SWORD: { id: 52, name: "Iron Sword", icon: "⚔️", placeable: false, tool: true, durability: 250, damage: 6, stackSize: 1 },
    
    // Special
    CRAFTING_TABLE: { id: 60, name: "Crafting Table", icon: "🪚", placeable: true, mat: 'WOOD', stackSize: 64 },
    FURNACE: { id: 61, name: "Furnace", icon: "🔥", placeable: true, mat: 'STONE', stackSize: 64 }
};

// Block breaking drops - maps block type to item key
export const BLOCK_DROPS = {
    'GRASS': 'DIRT',
    'DIRT': 'DIRT',
    'STONE': 'COBBLESTONE',
    'COAL': 'COAL',
    'IRON': 'IRON_ORE',
    'DIAMOND': 'DIAMOND',
    'WOOD': 'WOOD',
    'LEAF': null, // Leaves drop saplings rarely, simplified to nothing
    'LEAVES': null,
    'BEDROCK': null, // Unbreakable
    'SAND': 'SAND'
};

// Mining times (in seconds) - tool efficiency affects this
export const MINING_TIMES = {
    'GRASS': 0.1,
    'DIRT': 0.1,
    'STONE': 0.4,
    'COAL': 0.4,
    'IRON': 0.6,
    'DIAMOND': 0.8,
    'WOOD': 0.2,
    'LEAF': 0.05,
    'LEAVES': 0.05,
    'BEDROCK': Infinity,
    'SAND': 0.1
};

// Crafting recipes
export const RECIPES = [
    // Basic crafting
    { name: "Oak Planks (4)", req: { WOOD: 1 }, out: { PLANKS: 4 }, shapeless: true },
    { name: "Sticks (4)", req: { PLANKS: 2 }, out: { STICK: 4 }, shapeless: true },
    
    // Tools - shaped crafting (simplified as shapeless)
    { name: "Wooden Pickaxe", req: { PLANKS: 3, STICK: 2 }, out: { WOODEN_PICKAXE: 1 } },
    { name: "Stone Pickaxe", req: { COBBLESTONE: 3, STICK: 2 }, out: { STONE_PICKAXE: 1 } },
    { name: "Iron Pickaxe", req: { IRON_INGOT: 3, STICK: 2 }, out: { IRON_PICKAXE: 1 } },
    { name: "Diamond Pickaxe", req: { DIAMOND: 3, STICK: 2 }, out: { DIAMOND_PICKAXE: 1 } },
    
    { name: "Wooden Axe", req: { PLANKS: 3, STICK: 2 }, out: { WOODEN_AXE: 1 } },
    { name: "Stone Axe", req: { COBBLESTONE: 3, STICK: 2 }, out: { STONE_AXE: 1 } },
    
    { name: "Wooden Sword", req: { PLANKS: 2, STICK: 1 }, out: { WOODEN_SWORD: 1 } },
    { name: "Stone Sword", req: { COBBLESTONE: 2, STICK: 1 }, out: { STONE_SWORD: 1 } },
    { name: "Iron Sword", req: { IRON_INGOT: 2, STICK: 1 }, out: { IRON_SWORD: 1 } },
    
    // Special blocks
    { name: "Crafting Table", req: { PLANKS: 4 }, out: { CRAFTING_TABLE: 1 }, shapeless: true },
    
    // Smelting (simplified - requires furnace in real Minecraft)
    { name: "Coal (from Coal Ore)", req: { COAL_ORE: 1 }, out: { COAL: 1 } },
    { name: "Iron Ingot (from Iron Ore)", req: { IRON_ORE: 1 }, out: { IRON_INGOT: 1 } }
];
