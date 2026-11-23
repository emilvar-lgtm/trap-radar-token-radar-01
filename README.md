# trap-radar-token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/emilvar-lgtm/trap-radar-token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/emilvar-lgtm/trap-radar-token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Trap Radar — a token launch radar that prices rug risk into every row. It ranks pre-token protocols by risk-adjusted implied value: a protocol whose TVL is fleeing, whose growth is a sudden spike, or whose record is opaque is worth less than the same TVL in a steady, old, multi-chain protocol. Only genuine launch candidates are ranked; wrapped, staked or bridged products of tokens that already trade are excluded, not ranked as if they were launches.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, scores every rankable pre-token protocol with the model in `lib/rugmodel.ts`, writes the ranked board to `out/board.json`, the dashboard data to `out/data.js`, and copies `dashboard/` and `screenshots/` to `out/` with `out/dossier.json`.

## The model

Implied value = TVL × 0.25 × growth × maturity × trust. Growth clamps the 7-day TVL change to −60…+120% at half weight; maturity rises from 0.6 to 1.0 over three years (unknown age counts as one year); trust = 1 − (risk ÷ 100) × 0.6, where risk (0–100) comes from TVL flight, pump spikes, opaque or young age, single-chain concentration, whale venues, bridge category, and instant-whale growth. Bands: SAFE 0–24, WATCH 25–49, RISKY 50–74, RED FLAG 75–100. Every farm plan sizes capital down as risk rises and carries an exit trigger: if 7-day TVL falls more than 20% or withdrawals pause, unwind within 24 hours.

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
