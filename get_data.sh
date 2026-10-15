#!/usr/bin/env bash
# Download ASHRAE Global Thermal Comfort Database II v2.1.0 (CBE GitHub mirror of the Dryad dataset)
set -euo pipefail
mkdir -p data/raw
[ -d data/raw/ashrae-db-II ] || git clone --depth 1 https://github.com/CenterForTheBuiltEnvironment/ashrae-db-II.git data/raw/ashrae-db-II
