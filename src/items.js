// Item Definitions
export const ITEMS = {
    WOOD: { id: 1, name: "Wood Log", icon: "🪵", placeable: true, mat: 'WOOD' },
    PLANK: { id: 2, name: "Plank", icon: "🟫", placeable: true, mat: 'WOOD' }, // Re-use wood texture for now
    STICK: { id: 3, name: "Stick", icon: "🥢", placeable: false },
    TABLE: { id: 4, name: "Crafting Table", icon: "🪚", placeable: true, mat: 'WOOD' },
    STONE: { id: 5, name: "Cobblestone", icon: "⬜", placeable: true, mat: 'STONE' },
    PICKAXE_WOOD: { id: 6, name: "Wood Pickaxe", icon: "⛏️", placeable: false, tool: true },
    PICKAXE_STONE: { id: 7, name: "Stone Pickaxe", icon: "⛏️", placeable: false, tool: true },
    DIRT: { id: 8, name: "Dirt", icon: "🟫", placeable: true, mat: 'DIRT' },
    DIAMOND: { id: 9, name: "Diamond", icon: "💎", placeable: false },
};

// Crafting Recipes
export const RECIPES = [
    { name: "Planks (4)", req: { WOOD: 1 }, out: { PLANK: 4 } },
    { name: "Sticks (4)", req: { PLANK: 2 }, out: { STICK: 4 } },
    { name: "Crafting Table", req: { PLANK: 4 }, out: { TABLE: 1 } },
    { name: "Wood Pickaxe", req: { STICK: 2, PLANK: 3 }, out: { PICKAXE_WOOD: 1 } },
    { name: "Stone Pickaxe", req: { STICK: 2, STONE: 3 }, out: { PICKAXE_STONE: 1 } }
];
