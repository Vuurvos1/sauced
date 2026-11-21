terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # State lives in R2. The endpoint carries the account id, so it is passed at init:
  #   tofu init -backend-config="endpoints={s3=\"https://<account_id>.r2.cloudflarestorage.com\"}"
  backend "s3" {
    bucket = "sauced-tfstate"
    key    = "sauced.tfstate"
    region = "auto"

    use_lockfile = true

    # R2 speaks the S3 API but none of AWS's account or region machinery.
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}

provider "cloudflare" {
  # Reads CLOUDFLARE_API_TOKEN from the environment.
}
