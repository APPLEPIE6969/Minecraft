import * as THREE from 'three';
import { getBlock, BLOCKS } from './world.js';

const playerSize = { w: 0.6, h: 1.8 }; // Player width/height

export function resolveCollision(pos, velocity) {
    // Separate Axes to prevent getting stuck
    
    // 1. Y Axis (Gravity/Floor)
    if (checkCollisions(pos.x, pos.y + velocity.y, pos.z)) {
        // If falling
        if(velocity.y < 0) {
             velocity.y = 0;
             pos.y = Math.ceil(pos.y - 1.8) + 0.001; // Snap to floor
             return true; // Is Grounded
        }
        // If jumping into ceiling
        if(velocity.y > 0) velocity.y = 0;
    } else {
        pos.y += velocity.y;
    }

    // 2. X Axis
    if (!checkCollisions(pos.x + velocity.x, pos.y, pos.z)) {
        pos.x += velocity.x;
    }

    // 3. Z Axis
    if (!checkCollisions(pos.x, pos.y, pos.z + velocity.z)) {
        pos.z += velocity.z;
    }
    
    return false; // Not grounded (unless caught by step 1)
}

function checkCollisions(x, y, z) {
    // Check feet, mid-body, and head
    // Very simple point-based check
    if (isSolid(x, y, z)) return true;
    if (isSolid(x, y + 0.9, z)) return true;
    if (isSolid(x, y + 1.7, z)) return true;
    return false;
}

function isSolid(x, y, z) {
    const id = getBlock(Math.round(x), Math.round(y), Math.round(z));
    return id !== BLOCKS.AIR && id !== BLOCKS.WATER;
}
