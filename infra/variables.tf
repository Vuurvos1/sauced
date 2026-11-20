variable "account_id" {
  type        = string
  description = "Cloudflare account id."

  # Empty, every resource fails mid-apply with "missing required account_id".
  validation {
    condition     = can(regex("^[0-9a-f]{32}$", var.account_id))
    error_message = "account_id must be the 32-character Cloudflare account id."
  }
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
