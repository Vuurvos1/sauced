terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

variable "name" {
  type = string
}

variable "account_id" {
  type = string
}

variable "zone_id" {
  type = string
}

variable "image_domain" {
  type = string
}

variable "database_url" {
  type      = string
  sensitive = true
}

locals {
  # postgres[ql]://user:password@host[:port]/database[?params]
  db = regex(
    "^postgres(?:ql)?://(?P<user>[^:]+):(?P<password>[^@]+)@(?P<host>[^:/]+)(?::(?P<port>\\d+))?/(?P<database>[^?]+)",
    var.database_url
  )
}

resource "cloudflare_r2_bucket" "images" {
  account_id = var.account_id
  name       = "sauced-images-${var.name}"
  location   = "weur"
}

resource "cloudflare_r2_custom_domain" "images" {
  account_id  = var.account_id
  bucket_name = cloudflare_r2_bucket.images.name
  domain      = var.image_domain
  zone_id     = var.zone_id
  enabled     = true
}

resource "cloudflare_hyperdrive_config" "db" {
  account_id = var.account_id
  name       = "sauced-${var.name}"

  # Repeated reads are answered from Hyperdrive's cache without waking Neon, which
  # bills for time awake. Cloudflare's default too; stated so plans don't drift.
  caching = {
    disabled = false
  }

  origin = {
    scheme   = "postgres"
    host     = local.db.host
    port     = local.db.port != null ? tonumber(local.db.port) : 5432
    database = local.db.database
    user     = local.db.user
    password = local.db.password
  }
}

output "image_bucket" {
  value = cloudflare_r2_bucket.images.name
}

output "image_base_url" {
  value = "https://${var.image_domain}"
}

output "hyperdrive_id" {
  value = cloudflare_hyperdrive_config.db.id
}
