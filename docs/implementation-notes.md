# Implementation Constraints for User Review Improvements

The requested feature set targets a Unity-based mobile runner with ScriptableObject-driven data, 3D character control, and Input System bindings. The current repository hosts a standalone HTML5/Canvas prototype without a Unity project structure, asset pipeline, or C# runtime. As a result, the following gaps prevent a direct implementation:

1. **Missing Unity project** – There is no `Assets/` hierarchy, scene files, prefabs, or C# compilation pipeline to host `ScriptableObject` definitions, `MonoBehaviour` scripts, object pools, or Input System assets.
2. **Web-based runtime** – Existing gameplay is authored entirely in JavaScript. The Unity-specific types (e.g., `ScriptableObject`, `ScrollRect`, `VerticalLayoutGroup`) and serialization features do not exist in this environment.
3. **UI framework mismatch** – The HTML HUD relies on DOM manipulation rather than Unity UI. Rewriting the UI to match the specification would require porting the entire project into Unity.
4. **Asset dependencies** – The spec references sprites, prefabs, and animation frames that are not present. Creating placeholder assets without the original art direction would be speculative.

## Recommended Path Forward

To satisfy the review-driven improvements, the project must first migrate (or recreate) the game inside Unity. Once the Unity project is available, the requested systems can be implemented as follows:

- Establish `ItemDefinition` and `EnemyDefinition` ScriptableObjects that feed result, help, and spawner systems.
- Build Unity UI panels (`ResultPanel`, `HelpCompendium`, `SettingsPanel`, `RankingScene`) using `ScrollRect`, `VerticalLayoutGroup`, and object pooling.
- Integrate the new Input System for swappable controls and sensitivity settings.
- Update `PlayerHealth` to enforce 3-second invincibility with consistent visual/audio feedback.
- Extend `EnemySpawner` with wave-based difficulty scaling and configurable move patterns.

Once a Unity foundation is committed to the repository, these features can be iteratively added. Until then, implementing the requested functionality in this JavaScript prototype would not match the expected runtime behavior described in the specification.
