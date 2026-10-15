# Replication of Favero, Luparelli & Carlucci (2023), Energy & Buildings 281, 112755
# Tables 3-7 and the derived quantities in Figs 9-11.
# Data: Indraganti et al. (2014) subset of ASHRAE DB II v2.1.0 (see 01_extract_favero_subset.R)
# Priors: brms defaults (the paper does not report priors).
suppressPackageStartupMessages({library(brms); library(dplyr)})
options(mc.cores = 4, brms.backend = "rstan")
dir.create("output/fits", recursive = TRUE, showWarnings = FALSE)

raw <- read.csv("data/processed/favero_india_subset.csv")
d <- raw |>
  filter(!is.na(thermal_sensation), !is.na(gender), !is.na(ta)) |>
  transmute(
    tsv_num = thermal_sensation + 4,                     # 1 (cold) .. 7 (hot)
    tsv     = factor(tsv_num, levels = 1:7, ordered = TRUE),
    gender  = factor(gender, levels = c("female", "male")),
    male    = as.integer(gender == "male"),
    tair_s  = as.numeric(scale(ta))
  )
stopifnot(nrow(d) == 6048)
sd_ta <- sd(raw$ta)

fit <- function(name, formula, family, ...) {
  brm(formula, data = d, family = family, chains = 4, iter = 2000, seed = 2023,
      refresh = 0, file = file.path("output/fits", name), ...)
}
cp <- cumulative("probit")

m <- list(
  # Table 3: unconditional
  cp0 = fit("cp0", tsv ~ 1, cp),
  g0  = fit("g0",  tsv_num ~ 1, gaussian()),
  # Table 4: + Gender, constant SD
  cp1 = fit("cp1", tsv ~ gender, cp),
  g1  = fit("g1",  tsv_num ~ gender, gaussian()),
  # Table 5: + SD varying by Gender (female disc fixed at 0 => sigma = 1)
  cp2 = fit("cp2", bf(tsv ~ gender, disc ~ 0 + male), cp),
  g2  = fit("g2",  bf(tsv_num ~ gender, sigma ~ 0 + gender), gaussian()),
  # Table 6: + standardised air temperature
  cp3 = fit("cp3", bf(tsv ~ gender + tair_s, disc ~ 0 + male), cp),
  g3  = fit("g3",  bf(tsv_num ~ gender + tair_s, sigma ~ 0 + gender), gaussian()),
  # Table 7: equidistant thresholds
  cp3e = fit("cp3e", bf(tsv ~ gender + tair_s, disc ~ 0 + male),
             cumulative("probit", threshold = "equidistant"))
)

# ---- Paper values (Est., Est.Error, L-95, U-95) ----
P <- function(tab, model, par, est, se, l, u) data.frame(tab, model, par, p_est = est, p_se = se, p_l = l, p_u = u)
paper <- rbind(
  P("T3","cp0","b_Intercept[1]",-2.54,.06,-2.66,-2.42), P("T3","cp0","b_Intercept[2]",-1.25,.02,-1.29,-1.21),
  P("T3","cp0","b_Intercept[3]",-0.35,.02,-0.38,-0.32), P("T3","cp0","b_Intercept[4]",0.48,.02,0.45,0.52),
  P("T3","cp0","b_Intercept[5]",0.96,.02,0.92,1.00),    P("T3","cp0","b_Intercept[6]",1.47,.02,1.42,1.52),
  P("T3","g0","b_Intercept",4.08,.02,4.04,4.11),        P("T3","g0","sigma",1.37,.01,1.35,1.39),

  P("T4","cp1","b_Intercept[1]",-2.49,.06,-2.62,-2.37), P("T4","cp1","b_Intercept[2]",-1.20,.03,-1.26,-1.14),
  P("T4","cp1","b_Intercept[3]",-0.30,.03,-0.35,-0.24), P("T4","cp1","b_Intercept[4]",0.53,.03,0.48,0.59),
  P("T4","cp1","b_Intercept[5]",1.01,.03,0.96,1.07),    P("T4","cp1","b_Intercept[6]",1.52,.03,1.46,1.58),
  P("T4","cp1","b_gendermale",0.07,.03,0.01,0.13),
  P("T4","g1","b_Intercept",4.03,.03,3.96,4.10),        P("T4","g1","b_gendermale",0.06,.04,-0.02,0.14),
  P("T4","g1","sigma",1.37,.01,1.35,1.39),

  P("T5","cp2","b_Intercept[1]",-2.28,.07,-2.41,-2.14), P("T5","cp2","b_Intercept[2]",-1.09,.03,-1.16,-1.02),
  P("T5","cp2","b_Intercept[3]",-0.27,.03,-0.32,-0.21), P("T5","cp2","b_Intercept[4]",0.48,.03,0.43,0.54),
  P("T5","cp2","b_Intercept[5]",0.92,.03,0.85,0.98),    P("T5","cp2","b_Intercept[6]",1.38,.04,1.30,1.46),
  P("T5","cp2","b_gendermale",0.06,.03,0.00,0.12),      P("T5","cp2","b_disc_male",0.14,.02,0.09,0.18),
  P("T5","g2","b_Intercept",4.04,.04,3.96,4.11),        P("T5","g2","b_gendermale",0.06,.04,-0.02,0.14),
  P("T5","g2","b_sigma_genderfemale",0.39,.02,0.36,0.42), P("T5","g2","b_sigma_gendermale",0.28,.01,0.26,0.31),

  P("T6","cp3","b_Intercept[1]",-2.39,.07,-2.53,-2.25), P("T6","cp3","b_Intercept[2]",-1.15,.04,-1.23,-1.08),
  P("T6","cp3","b_Intercept[3]",-0.28,.03,-0.34,-0.23), P("T6","cp3","b_Intercept[4]",0.53,.03,0.47,0.59),
  P("T6","cp3","b_Intercept[5]",1.01,.03,0.94,1.08),    P("T6","cp3","b_Intercept[6]",1.52,.04,1.44,1.60),
  P("T6","cp3","b_gendermale",0.09,.03,0.03,0.14),      P("T6","cp3","b_tair_s",0.34,.01,0.31,0.37),
  P("T6","cp3","b_disc_male",0.12,.02,0.07,0.16),
  P("T6","g3","b_Intercept",4.01,.03,3.95,4.08),        P("T6","g3","b_gendermale",0.09,.04,0.01,0.16),
  P("T6","g3","b_tair_s",0.47,.02,0.44,0.51),
  P("T6","g3","b_sigma_genderfemale",0.32,.02,0.28,0.35), P("T6","g3","b_sigma_gendermale",0.22,.01,0.20,0.25)
)

ours <- do.call(rbind, lapply(unique(paper$model), function(k) {
  s <- posterior::summarise_draws(as_draws_df(m[[k]]), "mean", "sd",
                                  ~quantile(.x, c(.025, .975)))
  data.frame(model = k, par = s$variable, est = s$mean, se = s$sd, l = s$`2.5%`, u = s$`97.5%`)
}))
cmp <- left_join(paper, ours, by = c("model", "par")) |>
  mutate(diff = est - p_est, across(where(is.numeric), ~round(.x, 3)))

# ---- Diagnostics ----
diag <- do.call(rbind, lapply(names(m), function(k) {
  s <- posterior::summarise_draws(as_draws_df(m[[k]]), "rhat", "ess_bulk")
  s <- s[grepl("^b_|^sigma$", s$variable), ]
  data.frame(model = k, max_rhat = max(s$rhat), min_ess_bulk = min(s$ess_bulk))
}))

# ---- Derived quantities (Figs 9-11): posterior mode and 95% HDI ----
hdi <- function(x, p = .95) {
  x <- sort(x); n <- length(x); k <- floor(p * n)
  i <- which.min(x[(k + 1):n] - x[1:(n - k)]); c(x[i], x[i + k])
}
mode_d <- function(x) { dd <- density(x); dd$x[which.max(dd$y)] }
summ <- function(name, x) { h <- hdi(x); data.frame(quantity = name, mode = mode_d(x), hdi_l = h[1], hdi_u = h[2]) }
n_f <- sum(d$gender == "female"); n_m <- sum(d$gender == "male")
pooled <- function(s1, s2) sqrt(((n_f - 1) * s1^2 + (n_m - 1) * s2^2) / (n_f + n_m - 2))

a <- as_draws_df(m$cp2); sd_m <- 1 / exp(a$b_disc_male)
g <- as_draws_df(m$g2);  sf_g <- exp(g$b_sigma_genderfemale); sm_g <- exp(g$b_sigma_gendermale)
c3 <- as_draws_df(m$cp3); g3 <- as_draws_df(m$g3); e3 <- as_draws_df(m$cp3e)
thr <- as.matrix(c3[, paste0("b_Intercept[", 1:6, "]")])

derived <- rbind(
  cbind(fig = "9-cp", rbind(
    summ("Male mean (= diff of means)", a$b_gendermale),
    summ("Male SD", sd_m),
    summ("Difference of SD", sd_m - 1),
    summ("Effect size", a$b_gendermale / pooled(1, sd_m)))),
  cbind(fig = "9-g", rbind(
    summ("Female mean", g$b_Intercept),
    summ("Male mean", g$b_Intercept + g$b_gendermale),
    summ("Difference of means", g$b_gendermale),
    summ("Female SD", sf_g), summ("Male SD", sm_g),
    summ("Difference of SD", sm_g - sf_g),
    summ("Effect size", g$b_gendermale / pooled(sf_g, sm_g)))),
  cbind(fig = "10", rbind(
    summ("cp Tair_s (standardised)", c3$b_tair_s),
    summ("g Tair_s (standardised)", g3$b_tair_s),
    summ("cp Tair (per degC)", c3$b_tair_s / sd_ta),
    summ("g Tair (per degC)", g3$b_tair_s / sd_ta))),
  cbind(fig = "11", rbind(
    summ("Spacing (structured)", e3$delta),
    summ("Mean spacing (unstructured)", (thr[, 6] - thr[, 1]) / 5),
    summ("Difference in spacing", e3$delta - (thr[, 6] - thr[, 1]) / 5)))
)
paper_fig <- c(0.059, 0.870, -0.130, 0.065,  4.035, 4.092, 0.049, 1.477, 1.330, -0.143, 0.036,
               0.343, 0.475, 0.162, 0.224,  0.716, 0.781, -0.067)
derived$paper_mode <- paper_fig
derived <- derived |> mutate(across(where(is.numeric), ~round(.x, 3)))

# ---- Table 7: LOOIC ----
l_u <- loo(m$cp3); l_e <- loo(m$cp3e)
lc <- loo_compare(l_u, l_e)
t7 <- data.frame(
  model = c("unstructured", "equidistant"),
  looic = c(l_u$estimates["looic", "Estimate"], l_e$estimates["looic", "Estimate"]),
  se    = c(l_u$estimates["looic", "SE"],       l_e$estimates["looic", "SE"]),
  paper_looic = c(19449.2, 20014.0), paper_se = c(100.0, 97.2)
)
t7$looic_diff <- c(0, -2 * lc[2, "elpd_diff"]); t7$se_diff <- c(0, 2 * lc[2, "se_diff"])
t7$paper_diff <- c(0, 564.81); t7$paper_se_diff <- c(0, 44.39)
t7 <- t7 |> mutate(across(where(is.numeric), ~round(.x, 2)))

# ---- Output ----
options(width = 200)
cat("\n=== Tables 3-6: paper vs replication ===\n"); print(cmp, row.names = FALSE)
cat("\n=== Figs 9-11: posterior mode / 95% HDI ===\n"); print(derived, row.names = FALSE)
cat("\n=== Table 7: LOOIC ===\n"); print(t7, row.names = FALSE)
cat("\n=== Convergence ===\n"); print(diag, row.names = FALSE)
write.csv(cmp, "output/favero_tables3-6_comparison.csv", row.names = FALSE)
write.csv(derived, "output/favero_figs9-11_comparison.csv", row.names = FALSE)
write.csv(t7, "output/favero_table7_comparison.csv", row.names = FALSE)
writeLines(capture.output(sessionInfo()), "output/sessionInfo.txt")
