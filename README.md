# final-year-project

Personalised ordinal thermal-comfort models for smart HVAC control (BSE3716 FYP).

Part 1 fits three comfort models to classroom thermal-sensation votes with R/brms:
A (ordinal-as-metric linear), B (population cumulative probit) and C (hierarchical
cumulative probit with occupant-specific threshold shift, scale and temperature slope).
Part 2 couples the fitted models to EnergyPlus controllers.

## Handover and project status

See **[HANDOFF.md](HANDOFF.md)** for the current status, decisions agreed with the supervisor, the open
issue with the survey backend and the prioritised to-do list.

| Folder | Contents |
|---|---|
| `docs/` | Online participant survey (GitHub Pages) |
| `survey/` | Google Apps Script backend, setup guide, QR code, Microsoft Forms backup |
| `proposal/` | Revised project proposal (docx/pdf) and the script that builds it |
| `R/`, `output/` | Toolchain smoke test and the Favero et al. (2023) replication |

## Setup

Tested on Ubuntu 24.04 with R 4.3.3, brms 2.20.4, rstan 2.32.5, ordinal 2023.12-4, loo 2.6.0
(full list in `output/sessionInfo.txt`).

```bash
sudo ./setup_env.sh      # R + brms toolchain from Ubuntu's r-cran-* packages
./get_data.sh            # ASHRAE Global Thermal Comfort Database II v2.1.0 -> data/raw/
```

`setup_env.sh` also works around Debian's BH package shipping without `include/`, which
otherwise stops rstan from compiling models ("Boost not found").

## Scripts

Run from the repository root.

| Script | Purpose |
|---|---|
| `R/00_smoke_test.R` | Checks that brms/Stan, loo and `ordinal::clmm` run |
| `R/01_extract_favero_subset.R` | Extracts the Indraganti et al. (2014) Indian office subset (6,048 votes) |
| `R/02_replicate_favero.R` | Replicates Favero et al. (2023) Tables 3–7 and Figs 9–11 (~30 min on 4 cores) |

Fitted models are cached in `output/fits/` (not tracked); delete them to force refitting.

## Replication of Favero et al. (2023)

Favero, Luparelli & Carlucci, "Analysis of subjective thermal comfort data: A statistical
point of view", *Energy and Buildings* 281 (2023) 112755. Comparison tables are in `output/`.

- **Tables 3–6** (45 parameters, cumulative probit and Gaussian models): every posterior
  mean is within 0.005 of the published value; SEs and 95% intervals also match.
- **Table 7** (LOOIC): unstructured 19,449.3 vs 19,449.2 published; equidistant
  20,014.0 vs 20,014.0; difference 564.7 (SE 44.4) vs 564.8 (SE 44.4).
- **Figs 9–11**: air-temperature coefficients and threshold spacing match to 2–3 decimals;
  gender effect-size modes differ by ≤ 0.01.
- All models: R-hat < 1.005, bulk ESS > 1,200. brms default priors reproduce the paper.

Notes for later modelling:

- The subset has no operative/radiant/globe temperature or PMV; only air temperature `ta`.
- A group-specific latent SD is specified as `disc ~ 0 + male` (reference group's disc fixed
  at 0). A free disc intercept is not identified alongside the thresholds, so Model C's
  occupant scale should likewise use `disc ~ 0 + (1 | occupant)`.
