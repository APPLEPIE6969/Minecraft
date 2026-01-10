import { ITEMS, RECIPES } from './items.js';

export class Inventory {
    constructor() {
        this.hotbar = new Array(9).fill(null); // Hotbar slots
        this.hotbarCounts = new Array(9).fill(0);
        this.selectedSlot = 0;
        
        // Full inventory (27 slots - 3 rows of 9)
        this.inventory = new Array(27).fill(null);
        this.inventoryCounts = new Array(27).fill(0);
        
        this.initUI();
    }

    initUI() {
        // Create hotbar UI
        const hotbarEl = document.getElementById('hotbar');
        if (hotbarEl) {
            hotbarEl.innerHTML = '';
            for (let i = 0; i < 9; i++) {
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.id = `slot-${i}`;
                slot.textContent = '';
                hotbarEl.appendChild(slot);
            }
        }
        
        // Create full inventory UI (hidden by default)
        let invContainer = document.getElementById('inventory-container');
        if (!invContainer) {
            invContainer = document.createElement('div');
            invContainer.id = 'inventory-container';
            invContainer.style.display = 'none';
            invContainer.style.position = 'absolute';
            invContainer.style.top = '50%';
            invContainer.style.left = '50%';
            invContainer.style.transform = 'translate(-50%, -50%)';
            invContainer.style.background = 'rgba(0, 0, 0, 0.9)';
            invContainer.style.padding = '20px';
            invContainer.style.border = '2px solid #555';
            invContainer.style.zIndex = '1000';
            invContainer.style.pointerEvents = 'auto';
            document.body.appendChild(invContainer);
            
            const invTitle = document.createElement('h2');
            invTitle.textContent = 'Inventory';
            invTitle.style.color = 'white';
            invTitle.style.textAlign = 'center';
            invContainer.appendChild(invTitle);
            
            const invGrid = document.createElement('div');
            invGrid.id = 'inventory-grid';
            invGrid.style.display = 'grid';
            invGrid.style.gridTemplateColumns = 'repeat(9, 48px)';
            invGrid.style.gap = '4px';
            invGrid.style.marginTop = '10px';
            invContainer.appendChild(invGrid);
            
            // 27 inventory slots
            for (let i = 0; i < 27; i++) {
                const slot = document.createElement('div');
                slot.className = 'inv-slot';
                slot.id = `inv-slot-${i}`;
                slot.style.width = '48px';
                slot.style.height = '48px';
                slot.style.border = '2px solid #555';
                slot.style.background = 'rgba(0, 0, 0, 0.4)';
                slot.style.color = 'white';
                slot.style.display = 'flex';
                slot.style.alignItems = 'center';
                slot.style.justifyContent = 'center';
                slot.style.fontSize = '24px';
                slot.style.position = 'relative';
                invGrid.appendChild(slot);
            }
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close (E)';
            closeBtn.style.width = '100%';
            closeBtn.style.marginTop = '10px';
            closeBtn.style.padding = '8px';
            closeBtn.onclick = () => this.toggle();
            invContainer.appendChild(closeBtn);
        }
        
        this.updateUI();
    }

    addItem(itemKey, count = 1) {
        const item = ITEMS[itemKey];
        if (!item) return false;
        
        const maxStack = item.stackSize || 64;
        
        // First try to stack in hotbar
        for (let i = 0; i < 9; i++) {
            if (this.hotbar[i] === item && this.hotbarCounts[i] < maxStack) {
                const canAdd = Math.min(count, maxStack - this.hotbarCounts[i]);
                this.hotbarCounts[i] += canAdd;
                count -= canAdd;
                if (count <= 0) {
                    this.updateUI();
                    return true;
                }
            }
        }
        
        // Then try to stack in inventory
        for (let i = 0; i < 27; i++) {
            if (this.inventory[i] === item && this.inventoryCounts[i] < maxStack) {
                const canAdd = Math.min(count, maxStack - this.inventoryCounts[i]);
                this.inventoryCounts[i] += canAdd;
                count -= canAdd;
                if (count <= 0) {
                    this.updateUI();
                    return true;
                }
            }
        }
        
        // Then find empty slots in hotbar
        for (let i = 0; i < 9; i++) {
            if (this.hotbar[i] === null) {
                const canAdd = Math.min(count, maxStack);
                this.hotbar[i] = item;
                this.hotbarCounts[i] = canAdd;
                count -= canAdd;
                if (count <= 0) {
                    this.updateUI();
                    return true;
                }
            }
        }
        
        // Finally find empty slots in inventory
        for (let i = 0; i < 27; i++) {
            if (this.inventory[i] === null) {
                const canAdd = Math.min(count, maxStack);
                this.inventory[i] = item;
                this.inventoryCounts[i] = canAdd;
                count -= canAdd;
                if (count <= 0) {
                    this.updateUI();
                    return true;
                }
            }
        }
        
        this.updateUI();
        return count < count; // Return true if at least some items were added
    }

    useItem(count = 1) {
        if (this.hotbar[this.selectedSlot] && this.hotbarCounts[this.selectedSlot] > 0) {
            this.hotbarCounts[this.selectedSlot] -= count;
            if (this.hotbarCounts[this.selectedSlot] <= 0) {
                // Check durability for tools
                const item = this.hotbar[this.selectedSlot];
                if (item.tool && item.durability) {
                    // Handle durability in game.js
                } else {
                    this.hotbar[this.selectedSlot] = null;
                }
                this.hotbarCounts[this.selectedSlot] = 0;
            }
            this.updateUI();
            return true;
        }
        return false;
    }

    getSelectedItem() {
        return this.hotbar[this.selectedSlot];
    }

    countItem(itemKey) {
        const item = ITEMS[itemKey];
        if (!item) return 0;
        
        let total = 0;
        
        // Count in hotbar
        for (let i = 0; i < 9; i++) {
            if (this.hotbar[i] === item) {
                total += this.hotbarCounts[i];
            }
        }
        
        // Count in inventory
        for (let i = 0; i < 27; i++) {
            if (this.inventory[i] === item) {
                total += this.inventoryCounts[i];
            }
        }
        
        return total;
    }

    craft(recipe) {
        // Check if can craft
        for (const [key, qty] of Object.entries(recipe.req)) {
            if (this.countItem(key) < qty) {
                return false;
            }
        }
        
        // Remove ingredients
        for (const [key, qty] of Object.entries(recipe.req)) {
            let remaining = qty;
            
            // Remove from hotbar first
            for (let i = 0; i < 9; i++) {
                if (this.hotbar[i] === ITEMS[key] && remaining > 0) {
                    const take = Math.min(remaining, this.hotbarCounts[i]);
                    this.hotbarCounts[i] -= take;
                    remaining -= take;
                    if (this.hotbarCounts[i] <= 0) {
                        this.hotbar[i] = null;
                        this.hotbarCounts[i] = 0;
                    }
                }
            }
            
            // Remove from inventory
            for (let i = 0; i < 27; i++) {
                if (this.inventory[i] === ITEMS[key] && remaining > 0) {
                    const take = Math.min(remaining, this.inventoryCounts[i]);
                    this.inventoryCounts[i] -= take;
                    remaining -= take;
                    if (this.inventoryCounts[i] <= 0) {
                        this.inventory[i] = null;
                        this.inventoryCounts[i] = 0;
                    }
                }
            }
        }
        
        // Add results
        for (const [key, qty] of Object.entries(recipe.out)) {
            this.addItem(key, qty);
        }
        
        this.updateUI();
        return true;
    }

    toggle() {
        const container = document.getElementById('inventory-container');
        const craftMenu = document.getElementById('crafting-menu');
        if (container) {
            if (container.style.display === 'none' || !container.style.display) {
                container.style.display = 'block';
                if (craftMenu) craftMenu.style.display = 'block';
                this.updateCrafting();
                return true;
            } else {
                container.style.display = 'none';
                if (craftMenu) craftMenu.style.display = 'none';
                return false;
            }
        }
        return false;
    }

    updateUI() {
        // Update hotbar
        for (let i = 0; i < 9; i++) {
            const slotEl = document.getElementById(`slot-${i}`);
            if (slotEl) {
                if (this.hotbar[i]) {
                    slotEl.textContent = this.hotbar[i].icon;
                    slotEl.setAttribute('data-count', this.hotbarCounts[i] > 1 ? this.hotbarCounts[i] : '');
                    
                    // Show durability for tools
                    if (this.hotbar[i].tool && this.hotbar[i].durability) {
                        // Durability bar would go here
                    }
                } else {
                    slotEl.textContent = '';
                    slotEl.setAttribute('data-count', '');
                }
                
                if (i === this.selectedSlot) {
                    slotEl.classList.add('selected');
                } else {
                    slotEl.classList.remove('selected');
                }
            }
        }
        
        // Update inventory grid
        for (let i = 0; i < 27; i++) {
            const slotEl = document.getElementById(`inv-slot-${i}`);
            if (slotEl) {
                if (this.inventory[i]) {
                    slotEl.textContent = this.inventory[i].icon;
                    slotEl.setAttribute('data-count', this.inventoryCounts[i] > 1 ? this.inventoryCounts[i] : '');
                } else {
                    slotEl.textContent = '';
                    slotEl.setAttribute('data-count', '');
                }
            }
        }
    }

    updateCrafting() {
        const list = document.getElementById('crafting-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        RECIPES.forEach(recipe => {
            const btn = document.createElement('div');
            btn.className = 'recipe-btn';
            btn.innerHTML = `<span>${recipe.name}</span><span id="recipe-${RECIPES.indexOf(recipe)}"></span>`;
            
            let canCraft = true;
            for (const [key, qty] of Object.entries(recipe.req)) {
                if (this.countItem(key) < qty) {
                    canCraft = false;
                    break;
                }
            }
            
            if (canCraft) {
                btn.style.color = '#00FF00';
                btn.style.cursor = 'pointer';
                btn.onclick = () => {
                    if (this.craft(recipe)) {
                        this.updateCrafting();
                    }
                };
            } else {
                btn.style.color = '#888';
                btn.style.cursor = 'not-allowed';
            }
            
            list.appendChild(btn);
        });
    }
}
