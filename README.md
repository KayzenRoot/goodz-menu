# Goodz Menu

Goodz Menu é uma plataforma operacional para negócios de alimentação. Esta branch reinicia a implementação pela fundação executável, preservando o produto aprovado, o Source Pack e o histórico Git.

## Estado desta branch

- Work Order: [GMZ-REBOOT-001](.engineering/work-orders/GMZ-REBOOT-001.md)
- Issue: [#73](https://github.com/KayzenRoot/goodz-menu/issues/73)
- Pull request draft: [#74](https://github.com/KayzenRoot/goodz-menu/pull/74)
- Escopo: shell visual, runtime local, health/readiness, correlação e harness de validação.
- Fora desta etapa: autenticação de produto, tenancy, catálogo, pedidos, finanças e qualquer dado de negócio.

O preview não representa um módulo concluído nem dados operacionais. A fundação deve passar por auditoria objetiva antes de iniciar o Work Order separado de `GMZ-M01`.

## Desenvolvimento

Veja [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md) para os comandos PowerShell, Supabase local isolado, Docker, testes e capturas de evidência.

```powershell
pnpm install --frozen-lockfile
pnpm supabase:start
pnpm dev
```

O runtime bloqueia URLs Supabase remotas e não usa chave service-role.
