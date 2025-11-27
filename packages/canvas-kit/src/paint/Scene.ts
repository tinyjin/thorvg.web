/**
 * Scene class for grouping paints
 */

import { Paint } from './Paint';
import { getModule } from '../core/Module';
import { sceneRegistry } from '../core/Registry';
import { checkResult } from '../core/errors';

export class Scene extends Paint {
  #children = new Set<Paint>();

  constructor() {
    const Module = getModule();
    const ptr = Module._tvg_scene_new();
    super(ptr, sceneRegistry);
  }

  protected _createInstance(ptr: number): Scene {
    const scene = Object.create(Scene.prototype) as Scene;
    // Manually initialize the scene with the new pointer
    Object.setPrototypeOf(scene, Scene.prototype);
    (scene as any).ptr = ptr;
    return scene;
  }

  /**
   * Add paints to the scene
   */
  public add(...paints: Paint[]): this {
    const Module = getModule();
    for (const paint of paints) {
      const result = Module._tvg_scene_push(this.ptr, (paint as any).ptr);
      checkResult(result, 'add');
      this.#children.add(paint);
    }
    return this;
  }

  /**
   * Remove paint(s) from the scene
   * If no paint is provided, removes all paints
   */
  public remove(paint?: Paint): this {
    const Module = getModule();

    if (paint) {
      const result = Module._tvg_scene_remove(this.ptr, (paint as any).ptr);
      checkResult(result, 'remove');
      this.#children.delete(paint);
    } else {
      // Remove all
      const result = Module._tvg_scene_remove(this.ptr, 0);
      checkResult(result, 'remove (all)');
      this.#children.clear();
    }
    return this;
  }

  /**
   * Clear all paints from the scene (alias for remove())
   */
  public clear(): this {
    return this.remove();
  }
}
