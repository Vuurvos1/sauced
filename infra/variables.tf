variable "account_id" {
  type        = string
  description = "Cloudflare account id."
}

variable "zone_name" {
  type        = string
  description = "The site's domain, already a Cloudflare zone."
  default     = "hotsauced.app"
}

variable "dev_database_url" {
  type        = string
  sensitive   = true
  description = "Direct (unpooled) Neon connection string for the dev branch. Hyperdrive pools on its own."
}

variable "prod_database_url" {
  type        = string
  sensitive   = true
  description = "Direct (unpooled) Neon connection string for the prod branch."
}
