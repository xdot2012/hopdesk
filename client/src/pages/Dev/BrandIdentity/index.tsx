import { useTranslation } from 'react-i18next';
import AppLogo from '~/components/AppLogo';
import EmptyState from '~/components/EmptyState';
import AppLoading from '~/components/AppLoading';
import ChangeModeButton from '~/components/ChangeModeButton';
import LogoMark from '~/components/brand/LogoMark';
import LogoWordmark from '~/components/brand/LogoWordmark';
import {
  TicketPriorityBadge,
  TicketSlaBadge,
  TicketStatusBadge,
} from '~/components/TicketBadges';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import ColorSwatch from './ColorSwatch';
import Section from './Section';

const BRAND_PALETTE = [
  {
    name: 'Teal Hop',
    role: 'Primary — CTAs, marca, sucesso',
    swatch: 'bg-primary',
    hex: '#008164',
    token: '--hop-green',
  },
  {
    name: 'Teal Hop Light',
    role: 'Primary no modo escuro',
    swatch: 'bg-hop-green-light',
    hex: '#009F82',
    token: '--hop-green-light',
  },
  {
    name: 'Pond',
    role: 'Superfícies escuras, navegação',
    swatch: 'bg-pond',
    hex: '#1e3a42',
    token: '--pond',
  },
  {
    name: 'Lily',
    role: 'Destaques, prioridade, energia',
    swatch: 'bg-lily',
    hex: '#e8d98a',
    token: '--lily',
  },
  {
    name: 'Teal Wash',
    role: 'Hover, accent de UI',
    swatch: 'bg-accent text-accent-foreground',
    hex: '#D1F5EA',
    token: '--accent',
  },
  {
    name: 'Off-white',
    role: 'Background workspace',
    swatch: 'bg-background border border-border',
    hex: '#F7FAF9',
    token: '--off-white',
  },
] as const;

const SEMANTIC_PALETTE = [
  { name: 'Destructive', swatch: 'bg-destructive', token: '--destructive' },
  { name: 'Muted', swatch: 'bg-muted', token: '--muted' },
  { name: 'Secondary', swatch: 'bg-secondary', token: '--secondary' },
  { name: 'Border', swatch: 'bg-border', token: '--border' },
] as const;

export default function BrandIdentityPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <AppLogo size="md" />
          <ChangeModeButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Identidade visual · URL interna</p>
          <h1 className="text-3xl font-bold tracking-tight">HopDesk Brand Kit</h1>
          <p className="max-w-2xl text-muted-foreground">{t('brand.tagline')}</p>
          <p className="font-mono text-xs text-muted-foreground">/brand/identity</p>
        </div>

        <Section
          title="Paleta de marca"
          description="Teal Hop como cor principal; Lily reservada para destaques operacionais."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BRAND_PALETTE.map((color) => (
              <ColorSwatch key={color.token} {...color} />
            ))}
          </div>
        </Section>

        <Section title="Tokens semânticos" description="Superfícies e feedback do sistema.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SEMANTIC_PALETTE.map((color) => (
              <ColorSwatch key={color.token} {...color} />
            ))}
          </div>
        </Section>

        <Section title="Tipografia" description="Jost — wordmark com Hop mais leve e Desk mais sólido.">
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Display</p>
                <LogoWordmark className="text-5xl" />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Heading</p>
                <p className="text-2xl font-bold">Movendo solicitações adiante</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Body</p>
                <p className="text-base text-muted-foreground">
                  Interface SaaS profissional e leve — tipografia clara, ícones funcionais e
                  linguagem direta nos momentos certos.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Label</p>
                <p className="text-sm font-medium">Chamados · Prioridade · SLA</p>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Logo" description="Mark do sapo + wordmark; Hop em teal e Desk no foreground.">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mark</CardTitle>
                <CardDescription>Sapo HopDesk em squircle mint</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-4">
                <LogoMark className="h-20 w-20" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wordmark</CardTitle>
                <CardDescription>Hop + Desk</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-4">
                <LogoWordmark className="text-4xl" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Combinado</CardTitle>
                <CardDescription>AppLogo completo</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-4">
                <AppLogo size="lg" />
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Botões" description="Primary preenchido; outline para ações secundárias.">
          <Card>
            <CardContent className="flex flex-wrap gap-3 p-6">
              <Button type="button">Primary</Button>
              <Button type="button" variant="secondary">
                Secondary
              </Button>
              <Button type="button" variant="outline">
                Outline
              </Button>
              <Button type="button" variant="ghost">
                Ghost
              </Button>
              <Button type="button" variant="destructive">
                Destructive
              </Button>
              <Button type="button" variant="link">
                Link
              </Button>
            </CardContent>
          </Card>
        </Section>

        <Section
          title="Badges operacionais"
          description="Status, prioridade e SLA — sempre com rótulo, nunca só cor."
        >
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap gap-2">
                <TicketStatusBadge status="triage" />
                <TicketStatusBadge status="open" />
                <TicketStatusBadge status="waiting_customer" />
                <TicketStatusBadge status="testing" />
                <TicketStatusBadge status="closed" />
              </div>
              <div className="flex flex-wrap gap-2">
                <TicketPriorityBadge code="low" label="Baixa" />
                <TicketPriorityBadge code="medium" label="Média" />
                <TicketPriorityBadge code="high" label="Alta" />
                <TicketPriorityBadge code="urgent" label="Urgente" />
              </div>
              <div className="flex flex-wrap gap-2">
                <TicketSlaBadge status="fulfilled" />
                <TicketSlaBadge status="due" />
                <TicketSlaBadge status="failed" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Estados de interface" description="Empty states e loading com ícones neutros.">
          <div className="grid gap-6 lg:grid-cols-2">
            <EmptyState
              title={t('tickets.empty')}
              description={t('tickets.emptyHint')}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Loading</CardTitle>
              </CardHeader>
              <CardContent>
                <AppLoading />
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Voz da marca" description="Tom claro e prestativo — PT e EN.">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              {[
                { key: 'tickets.empty', label: 'Empty inbox' },
                { key: 'tickets.created', label: 'Ticket criado' },
                { key: 'brand.resolved', label: 'Resolvido' },
                { key: 'brand.assigned', label: 'Atribuído' },
                { key: 'errors.pageTitle', label: '404' },
                { key: 'connectionError.title', label: 'Erro de conexão' },
              ].map(({ key, label }) => (
                <div key={key} className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 text-sm">{t(key as 'brand.resolved')}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </Section>

        <Section title="Superfícies" description="Cards, bordas e radius padrão (0.625rem).">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Card padrão</CardTitle>
                <CardDescription>Conteúdo secundário, listas, formulários.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Superfície branca sobre background off-white com sombra sutil.
                </p>
              </CardContent>
            </Card>
            <div className="rounded-xl border border-border bg-sidebar p-6 text-sidebar-foreground shadow-sm">
              <p className="font-semibold">Sidebar preview</p>
              <p className="mt-2 text-sm opacity-80">
                Navegação principal com accent teal wash no hover.
              </p>
              <div className="mt-4 rounded-md bg-sidebar-accent px-3 py-2 text-sm text-sidebar-accent-foreground">
                Item ativo / hover
              </div>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
