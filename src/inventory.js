import { ITEMS, RECIPES } from './items.js';

export class Inventory {
    constructor() {
        this.slots = new Array(9).fill(null); // Hotbar
        this.counts = new Array(9).fill(0);
        this.selected = 0;
        
        // Start Empty (Survival Mode)
        // No items added by default.
    }

    addItem(itemKey, count = 1) {
        // 1. Try to stack
        for (let i = 0; i < 9; i++) {
            if (this.slots[i] === ITEMS[itemKey]) {
                this.counts[i] += count;
                this.updateUI();
                return true;
            }
        }
        // 2. Find empty slot
        for (let i = 0; i < 9; i++) {
            if (this.slots[i] === null) {
                this.slots[i] = ITEMS[itemKey];
                this.counts[i] = count;
                this.updateUI();
                return true;
            }
        }
        return false; // Full
    }

    useItem() {
        if (this.slots[this.selected] && this.counts[this.selected] > 0) {
            this.counts[this.selected]--;
            if (this.counts[this.selected] <= 0) {
                this.slots[this.selected] = null;
            }
            this.updateUI();
            return true;
        }
        return false;
    }

    getSelectedItem() {
        return this.slots[this.selected];
    }

    updateUI() {
        const uiSlots = document.querySelectorAll('.slot');
        uiSlots.forEach((el, i) => {
            if (this.slots[i]) {
                el.innerText = this.slots[i].icon;
                el.setAttribute('data-count', this.counts[i]);
            } else {
                el.innerText = "";
                el.setAttribute('data-count', "");
            }
            
            // Highlight selected
            if(i === this.selected) el.classList.add('selected');
            else el.classList.remove('selected');
        });
        
        // Update Crafting UI if open
        this.updateCraftingUI();
    }

    updateCraftingUI() {
        const list = document.getElementById('crafting-list');
        if(!list) return;
        list.innerHTML = '';

        RECIPES.forEach(recipe => {
            const btn = document.createElement('div');
            btn.className = 'recipe-btn';
            btn.innerText = recipe.name;
            
            // Check if craftable
            let canCraft = true;
            for(const [key, qty] of Object.entries(recipe.req)) {
                if(this.countItem(key) < qty) canCraft = false;
            }

            if(canCraft) {
                btn.style.color = '#00FF00';
                btn.onclick = () => this.craft(recipe);
            } else {
                btn.style.color = '#555';
            }
            list.appendChild(btn);
        });
    }

    countItem(key) {
        let total = 0;
        for(let i=0; i<9; i++) {
            if(this.slots[i] === ITEMS[key]) total += this.counts[i];
        }
        return total;
    }

    craft(recipe) {
        // Remove ingredients
        for(const [key, qty] of Object.entries(recipe.req)) {
            let toRemove = qty;
            for(let i=0; i<9; i++) {
                if(this.slots[i] === ITEMS[key]) {
                    const take = Math.min(toRemove, this.counts[i]);
                    this.counts[i] -= take;
                    toRemove -= take;
                    if(this.counts[i] <= 0) this.slots[i] = null;
                    if(toRemove === 0) break;
                }
            }
        }
        // Add Result
        for(const [key, qty] of Object.entries(recipe.out)) {
            this.addItem(key, qty);
        }
    }
}
