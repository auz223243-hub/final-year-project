#!/usr/bin/env bash
# Rebuild the R/brms toolchain on Ubuntu 24.04 (CRAN is blocked here; uses Ubuntu's r-cran-* binaries)
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  r-base r-base-dev r-cran-brms r-cran-rstan r-cran-ordinal r-cran-loo \
  r-cran-posterior r-cran-bayesplot r-cran-tidyverse r-cran-data.table r-cran-bh
# Debian's BH ships without include/; rstan needs BH/include/boost
mkdir -p /usr/lib/R/site-library/BH/include
ln -sfn /usr/include/boost /usr/lib/R/site-library/BH/include/boost
