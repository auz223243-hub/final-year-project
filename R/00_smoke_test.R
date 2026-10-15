# Toolchain smoke test: R + brms/Stan + ordinal + loo
suppressPackageStartupMessages({library(brms); library(ordinal); library(loo)})
options(mc.cores = parallel::detectCores())
set.seed(1)

# Synthetic data: 20 occupants x 20 votes, 7-point scale
J <- 20; n <- 20
d <- data.frame(occ = factor(rep(1:J, each = n)), top = rnorm(J * n))
u <- rnorm(J, 0, 0.7)
d$y <- cut(1.2 * d$top + u[d$occ] + rnorm(J * n),
           breaks = c(-Inf, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, Inf),
           labels = FALSE, ordered_result = TRUE)
d$y <- factor(d$y, levels = 1:7, ordered = TRUE)

# Model C-like: cumulative probit, occupant threshold shift + slope, occupant scale via disc
fC <- brm(bf(y ~ top + (1 + top | occ), disc ~ 1 + (1 | occ)),
          data = d, family = cumulative("probit"),
          prior = prior(normal(0, 0.5), dpar = "disc", class = "sd"),
          chains = 2, iter = 1000, refresh = 0, seed = 1)
print(summary(fC))
print(loo(fC))

# Frequentist cross-check (random-intercept)
print(summary(clmm(y ~ top + (1 | occ), data = d, link = "probit")))
cat("\nSMOKE TEST OK\n")
