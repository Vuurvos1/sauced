# Infrastructure

Cloudflare resources as code, with [OpenTofu](https://opentofu.org/). One root config
manages both environments through the `modules/environment` module:

| Resource                    | dev                                            | prod                                        |
| --------------------------- | ---------------------------------------------- | ------------------------------------------- |
| R2 image bucket             | `sauced-images-dev` on `img-dev.hotsauced.app` | `sauced-images-prod` on `img.hotsauced.app` |
| Hyperdrive in front of Neon | `sauced-dev`                                   | `sauced-prod`                               |

Nothing here is applied automatically yet.

## Applying

State lives in an R2 bucket, `sauced-tfstate`, which has to exist before the first
`init`; create it once in the dashboard. Then, with a `CLOUDFLARE_API_TOKEN` that can
edit R2, Hyperdrive and DNS, and R2 S3 credentials for the state bucket in
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`:

```bash
tofu init -backend-config='endpoints={s3="https://<account_id>.r2.cloudflarestorage.com"}'
cp example.tfvars terraform.tfvars   # fill in; *.tfvars is git-ignored
tofu plan
tofu apply
```

The Neon connection strings must be the direct ones (no `-pooler` in the host):
Hyperdrive does its own pooling.
