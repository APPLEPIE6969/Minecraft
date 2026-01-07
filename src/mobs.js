import * as THREE from 'three';
import { getSurfaceHeight } from './world.js';

const geom = new THREE.BoxGeometry(0.6, 1.8, 0.6);
const headGeom = new THREE.BoxGeometry(0.4, 0.4, 0.4);

function createColorTex(color) {
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0,0,32,32);
    return new THREE.CanvasTexture(canvas);
}

const mat_zombie = new THREE.MeshLambertMaterial({ map: createColorTex('#4B6F44') });
const mat_pig = new THREE.MeshLambertMaterial({ map: createColorTex('#F08080') });

export class MobController {
    constructor(scene) {
        this.scene = scene;
        this.mobs = [];
        this.spawnTimer = 0;
    }

    spawnMob(type, playerPos) {
        const group = new THREE.Group();
        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 10;
        const x = Math.floor(playerPos.x + Math.cos(angle) * dist);
        const z = Math.floor(playerPos.z + Math.sin(angle) * dist);
        const y = getSurfaceHeight(x, z) + 1;

        if (type === 'zombie') {
            const body = new THREE.Mesh(geom, mat_zombie);
            body.position.y = 0.9;
            group.add(body);
            const head = new THREE.Mesh(headGeom, mat_zombie);
            head.position.y = 2.0;
            group.add(head);
        } else {
            const pigGeom = new THREE.BoxGeometry(0.9, 0.5, 0.9);
            const body = new THREE.Mesh(pigGeom, mat_pig);
            body.position.y = 0.5;
            group.add(body);
        }

        group.position.set(x, y, z);
        this.scene.add(group);
        this.mobs.push({ mesh: group, type: type, vel: new THREE.Vector3(), timer: 0 });
    }

    update(delta, playerPos) {
        if (this.mobs.length < 10) {
            this.spawnTimer += delta;
            if (this.spawnTimer > 2) {
                this.spawnMob(Math.random() > 0.5 ? 'zombie' : 'pig', playerPos);
                this.spawnTimer = 0;
            }
        }

        for (const mob of this.mobs) {
            const pos = mob.mesh.position;
            const dist = pos.distanceTo(playerPos);

            if (mob.type === 'zombie') {
                if (dist < 20 && dist > 1) {
                    const dx = playerPos.x - pos.x;
                    const dz = playerPos.z - pos.z;
                    const len = Math.sqrt(dx*dx + dz*dz);
                    mob.vel.x = (dx / len) * 2.5 * delta;
                    mob.vel.z = (dz / len) * 2.5 * delta;
                    mob.mesh.lookAt(playerPos.x, pos.y, playerPos.z);
                } else {
                    mob.vel.x = 0; mob.vel.z = 0;
                }
            } else {
                mob.timer += delta;
                if (mob.timer > 3) {
                    mob.vel.x = (Math.random() - 0.5) * 2 * delta;
                    mob.vel.z = (Math.random() - 0.5) * 2 * delta;
                    mob.timer = 0;
                    mob.mesh.rotation.y = Math.atan2(mob.vel.x, mob.vel.z);
                }
            }

            mob.vel.y -= 15 * delta;
            pos.x += mob.vel.x;
            pos.z += mob.vel.z;
            pos.y += mob.vel.y * delta;

            const groundH = getSurfaceHeight(pos.x, pos.z);
            if (pos.y < groundH) {
                pos.y = groundH;
                mob.vel.y = 0;
            }
            if(pos.y < -20) { pos.y = 50; mob.vel.y = 0; }
        }
    }
}
