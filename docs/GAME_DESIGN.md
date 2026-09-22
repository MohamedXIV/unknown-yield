# Game Design

## 1. High concept

Unknown Yield is a 2D top-down / three-quarter industrial discovery game set on an off-world extraction site.

The player operates a company-backed industrial expedition. The world contains unfamiliar deposits, liquids, gases, and other materials whose useful behavior is not known in advance. The player extracts them, applies industrial operations, observes the result, records knowledge, turns successful experiments into stable production, and exports useful output through an off-world terminal.

The core fantasy is not merely:

> Build a large factory.

It is:

> **Be the first operator to learn what this material does, then turn that knowledge into industry.**

## 2. Design pillars

### 2.1 Discover, do not consume a recipe wiki

The game should not present a complete recipe book and ask the player to assemble known chains.

Operations are verbs:

- crush
- grind
- wash
- heat
- cool
- compress
- separate
- dissolve
- distill
- catalyze
- charge
- irradiate
- grow
- stabilize

A material may respond differently depending on operation, conditions, other inputs, or sequencing.

The implementation may contain deterministic reaction definitions. Those definitions are **designer knowledge**, not automatically player knowledge.

### 2.2 Experimentation can fail productively

An experiment may yield:

- a useful new material;
- an intermediate product;
- a useless output;
- a low-yield result;
- an unstable compound;
- a gas, residue, waste stream, or by-product;
- equipment fouling or a jam;
- a leak, fire, pressure event, or other accident;
- severe module or factory damage in rare high-risk cases.

Failure should usually produce information. A dangerous outcome can itself become a discovery.

Accidents must be explainable by the simulated conditions. Avoid arbitrary "RNG explosion" design. Randomness may vary severity or presentation, but the cause should be traceable to materials, process, operating range, containment, or known/unknown hazards.

### 2.3 Factory as function

A factory is a player-defined building, not only a prefab recipe machine.

The player can:

1. define or expand a footprint;
2. place or reposition ports;
3. enter an interior edit mode;
4. arrange machines and internal routing;
5. stabilize the process;
6. leave edit mode and treat the factory as a black box.

A sealed/stable factory should expose a readable contract:

```text
Inputs
- Material A: 12/min
- Brine:       4/min

Outputs
- Product C:   7/min
- Waste Gas:   2/min

Status
- stable
- bottleneck: none
- known hazard: pressure
```

The exterior world should not require the player to visually parse every internal belt forever.

Factories may later support:

- blueprints;
- resizing without rebuilding the interior from scratch;
- relocation while preserving the internal layout;
- higher-level composition into industrial modules or complexes.

These are progression opportunities, not MVP requirements.

### 2.4 Industrialization is progression

The key transition is:

```text
uncertain experiment
    -> observed behavior
    -> repeatable process
    -> reliable factory
    -> scaled production
```

The player should feel that knowledge has converted chaos into infrastructure.

### 2.5 The company creates dependency and purpose

The player is not building an independent civilization.

The terminal connects the operation to the off-world company. It is the economic and technological umbilical cord of the expedition.

Local production supplies most construction materials. Exports are valuable because they secure company allocations, especially fuel and advanced supplies that cannot simply be mined locally.

The company should remain relevant throughout the campaign.

## 3. Core gameplay loop

```text
SCAN / OBSERVE
      |
FIND MATERIAL
      |
EXTRACT
      |
PROCESS / COMBINE
      |
EXPERIMENT
      |
OBSERVE RESULT
      |
+-----+-------------------+
|                         |
useful                  hazardous / useless
|                         |
record knowledge       record knowledge
|                         |
INDUSTRIALIZE <-----------+
      |
LOGISTICS
      |
TERMINAL
      |
EXPORT
  |          |
FUEL      MILESTONES / CAPABILITY
  |          |
OPERATE   UNLOCK OPTIONS
   \        /
     EXPAND
       |
DEEPER / STRANGER MATERIALS
```

## 4. Knowledge and progression

### 4.1 No generic XP economy

The current design does **not** use a conventional "mine ore -> gain XP -> buy technology" progression.

Technology is milestone-driven and evidence-driven.

Examples:

- discover a deposit;
- successfully extract a material;
- expose it to heat;
- separate a phase;
- produce a new substance;
- sustain a stable throughput;
- successfully export a new class of product;
- demonstrate safe operation under pressure;
- deliver a corporate research request.

Unlocks should generally represent proven capability or discovered opportunity.

### 4.2 Knowledge graph, not a fully exposed recipe tree

The player may see partial observations:

```text
Material X
- reacts to salts
- becomes porous when heated
- conductivity rises under pressure
- unknown behavior remains
```

The game may hint that additional behavior exists without showing the hidden recipe.

The player-facing graph should distinguish:

- observed;
- inferred / hinted;
- confirmed;
- industrialized;
- unknown.

### 4.3 Technology principle

> Technology should remove an experienced constraint or enable a discovered opportunity.

Prefer this over passive upgrades such as endless "+15% belt speed" nodes.

Examples of meaningful capability unlocks:

- underground routing after surface congestion becomes a problem;
- elevated logistics to reclaim buildable space;
- pressure-capable equipment after discovering pressure-sensitive materials;
- cryogenic terminal handling after discovering valuable cold-chain output;
- deep scanning after surface deposits stop being enough.

## 5. Materials and processes

A material is more than a colored resource icon.

Important design dimensions may include:

- phase: solid, liquid, gas, slurry, organic, exotic;
- mass / density;
- temperature range;
- pressure sensitivity;
- corrosiveness;
- conductivity;
- volatility;
- fragility;
- atmospheric sensitivity;
- containment needs;
- transport compatibility;
- value density;
- discovered properties vs true hidden properties.

Not every dimension must exist in MVP. The content model should allow growth without forcing physical simulation of everything.

## 6. Logistics

Different material classes should create different logistical shapes.

Possible systems:

- belts / loaders for bulk solids;
- pipes for liquids;
- pressure lines or cylinders for gases;
- roads and vehicles for flexible freight;
- rail-like bulk transport for long-distance throughput;
- drones for low-mass, high-value cargo;
- specialized sealed, insulated, corrosive, hot, or containment transport where content justifies it.

Progression may add:

- underground routes;
- elevated gantries;
- utility tunnels;
- overhead pipe racks;
- cargo monorail or equivalent late-game systems.

These should solve real spatial or throughput problems rather than exist as cosmetic tier upgrades.

## 7. Terminal and economy

### 7.1 Construction

Most ordinary construction should be paid in **locally produced materials**, not abstract gold.

### 7.2 Fuel allocation

Industrial operation depends on company-supplied fuel/energy that the player earns through useful exports.

Current conceptual tiers:

- basic / industrial fuel;
- advanced fuel;
- exotic or research-grade fuel.

Names and exact rules remain content decisions.

Higher fuel classes should enable qualitatively different operations or infrastructure rather than only multiplying output.

### 7.3 Terminal as a real system

The terminal handles both directions:

```text
planet -> company: exports, samples, products
company -> planet: fuel, specialized supplies, advanced components
```

Terminal capability can expand through modules such as:

- dry cargo;
- liquid handling;
- pressurized gas;
- cryogenic storage;
- hazardous containment;
- secure high-value cargo.

The terminal should create logistics and capability constraints without becoming a waiting-game timer.

### 7.4 Corporate assistance / bailout

A player who collapses the fuel loop should have a recovery path rather than a hidden soft-lock.

The current design supports emergency corporate assistance:

- receive fuel and/or essential material assistance;
- record the assistance as an obligation;
- future export value first repays the obligation;
- repeated unresolved interventions can eventually terminate the operation.

The exact allowed count and reset conditions are balance data, not engine constants.

## 8. Factory movement and rebuilding

Planning should matter, but early mistakes should not force destructive busywork.

Desired direction:

- factories can expand when adjacent space permits;
- mature technology may allow relocating an intact factory;
- interior layout remains;
- external belts, pipes, roads, power, and other connections must be reconnected;
- relocation has cost and downtime.

This creates meaningful cost without requiring the player to manually rebuild a solved interior.

## 9. Tone

The world can be visually serious and industrial without making the simulation humorless.

Unexpected reactions may produce emergent, Sims-like stories:

- runaway foam;
- a vibrating reactor;
- a pressure event that blows a roof panel;
- a corrosive slurry eating the wrong pipe;
- a machine contaminating an adjacent line.

The humor should emerge from understandable systems rather than joke writing pasted on top.

## 10. Explicit non-goals for the foundation

Do not assume the game needs:

- combat;
- tower defense;
- armies;
- survival hunger/thirst;
- character crafting trees;
- fully simulated chemistry;
- fluid dynamics;
- thousands of physically simulated belt objects;
- open-world exploration;
- multiplayer;
- server authority;
- 3D runtime rendering;
- a native desktop shell from day one;
- Rust from day one.

Any of these requires a later design decision backed by a proven need.

## 11. First playable target

A good first playable slice should prove the loop with deliberately tiny content:

- one small map;
- one terminal;
- a few deposits;
- a small material set;
- a small operation set;
- one editable factory;
- a basic transport path;
- one unknown-to-known reaction;
- one useful export;
- one fuel feedback loop;
- one harmless or recoverable failure mode;
- one milestone unlock.

The goal is not content quantity. The goal is to answer:

> Is discovering an unknown process, stabilizing it, and turning it into an export line fun?
