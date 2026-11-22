data "cloudflare_zone" "site" {
  filter = {
    name = var.zone_name
  }
}

module "dev" {
  source = "./modules/environment"

  name         = "dev"
  account_id   = var.account_id
  zone_id      = data.cloudflare_zone.site.zone_id
  image_domain = "img-dev.${var.zone_name}"
  database_url = var.dev_database_url
  worker_name  = "sauced-dev"
  site_domain  = "dev.${var.zone_name}"
}

module "prod" {
  source = "./modules/environment"

  name         = "prod"
  account_id   = var.account_id
  zone_id      = data.cloudflare_zone.site.zone_id
  image_domain = "img.${var.zone_name}"
  database_url = var.prod_database_url
  worker_name  = "sauced"
  # hotsauced.app still points at Vercel. Moving it here is the cutover.
  site_domain = null
}
