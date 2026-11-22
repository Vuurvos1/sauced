# Infrastructure

Cloudflare resources as code, with [OpenTofu](https://opentofu.org/). One root config
manages both environments through the `modules/environment` module:

| Resource                    | dev                                            | prod                                        |
| --------------------------- | ---------------------------------------------- | ------------------------------------------- |
| R2 image bucket             | `sauced-images-dev` on `img-dev.hotsauced.app` | `sauced-images-prod` on `img.hotsauced.app` |
| Hyperdrive in front of Neon | `sauced-dev`                                   | `sauced-prod`                               |
| Site Worker                 | `sauced-dev` on `dev.hotsauced.app`            | `sauced`, on workers.dev until the cutover  |

The Workers are created here, empty; their code and bindings are deployed into them
by `wrangler` from `apps/site/wrangler.jsonc` (see the root README).

Nothing here is applied automatically yet.

## Applying

State lives in an R2 bucket, `sauced-tfstate`, which has to exist before the first
`init`; create it once in the dashboard. The credentials go in `infra/.env`
(git-ignored); `.env.example` says which token is which.

```bash
cp .env.example .env                 # fill in the three tokens
cp example.tfvars terraform.tfvars   # account id and the Neon URLs
set -a; . ./.env; set +a             # load them into this shell
tofu init -backend-config='endpoints={s3="https://<account_id>.r2.cloudflarestorage.com"}'
tofu plan
tofu apply
```

The Neon connection strings must be the direct ones (no `-pooler` in the host):
Hyperdrive does its own pooling.
