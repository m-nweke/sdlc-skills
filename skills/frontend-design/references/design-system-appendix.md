# Design System Install Reference

Cache of real install commands and canonical doc links, so a design-system choice is
grounded in production reality rather than training-data guesswork. Adapted from
[taste-skill](https://github.com/Leonxlnx/taste-skill). Load when the brief calls for an
official design system rather than a from-scratch aesthetic.

## Install commands

```bash
# Material Web (Material 3)
npm install @material/web

# Fluent UI React (v9)
npm install @fluentui/react-components

# Fluent UI Web Components (framework-free)
npm install @fluentui/web-components @fluentui/tokens

# IBM Carbon
npm install @carbon/react @carbon/styles

# Radix Themes
npm install @radix-ui/themes

# shadcn/ui (open code, owned components)
npx shadcn@latest init
npx shadcn@latest add button card badge separator input

# Primer CSS (GitHub product/devtool UI)
npm install --save @primer/css

# Primer Brand (GitHub marketing UI)
npm install @primer/react-brand

# GOV.UK Frontend
npm install govuk-frontend

# USWDS (US Web Design System)
npm install uswds

# Atlassian Design System (Atlaskit)
yarn add @atlaskit/css-reset @atlaskit/tokens @atlaskit/button @atlaskit/badge @atlaskit/section-message @atlaskit/card

# Bootstrap 5.3
npm install bootstrap

# Shopify Polaris Web Components (Shopify apps only)
# Add to app HTML head:
#   <meta name="shopify-api-key" content="%SHOPIFY_API_KEY%" />
#   <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
```

## Canonical sources (read before reinventing)

- **Material Web**: https://github.com/material-components/material-web ·
  https://material-web.dev/theming/material-theming/ · https://m3.material.io/develop/web
- **Fluent UI**: https://fluent2.microsoft.design/get-started/develop ·
  https://fluent2.microsoft.design/components/web/react/ ·
  https://github.com/microsoft/fluentui
- **Carbon**: https://carbondesignsystem.com/ ·
  https://github.com/carbon-design-system/carbon
- **Shopify Polaris**: https://shopify.dev/docs/api/app-home/web-components ·
  https://github.com/Shopify/polaris-react
- **Atlassian**: https://atlassian.design/get-started/develop ·
  https://atlassian.design/tokens/design-tokens
- **Primer**: https://primer.style/ · https://github.com/primer/css ·
  https://github.com/primer/brand
- **GOV.UK**: https://design-system.service.gov.uk/components/button/ ·
  https://github.com/alphagov/govuk-frontend
- **USWDS**: https://designsystem.digital.gov/documentation/developers/ ·
  https://designsystem.digital.gov/components/button/
