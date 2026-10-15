# Extract the Indraganti et al. (2014) Indian office subset used by Favero et al. (2023)
# Source: ASHRAE Global Thermal Comfort Database II v2.1.0
# (github.com/CenterForTheBuiltEnvironment/ashrae-db-II)
suppressPackageStartupMessages(library(dplyr))
src <- "data/raw/ashrae-db-II/v2.1.0"
meas <- read.csv(gzfile(file.path(src, "db_measurements_v2.1.0.csv.gz")))
meta <- read.csv(file.path(src, "db_metadata.csv"))

ids <- meta$building_id[meta$publication == "https://doi.org/10.1016/j.buildenv.2014.01.002"]
sub <- meas |>
  filter(building_id %in% ids) |>
  left_join(meta |> select(building_id, city, climate, building_type, cooling_type), by = "building_id")

stopifnot(nrow(sub) == 6048)
write.csv(sub, "data/processed/favero_india_subset.csv", row.names = FALSE)

cat("Records:", nrow(sub), " Buildings:", paste(sort(unique(sub$building_id)), collapse = ","), "\n")
print(table(sub$thermal_sensation, useNA = "ifany"))
print(table(sub$city, sub$cooling_type))
print(table(sub$season, useNA = "ifany"))
cat("\nMissing values per column (non-zero):\n")
na <- colSums(is.na(sub)); print(na[na > 0 & na < nrow(sub)])
cat("All-NA columns:", paste(names(na)[na == nrow(sub)], collapse = ", "), "\n")
print(summary(sub[, c("ta", "top", "tr", "rh", "vel", "clo", "met", "t_out", "pmv")]))
