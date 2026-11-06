window.__ModuleLoader__.load({
  id: 'dsh-plugin-companion-windows-check',
  factory(require) {
    const React = require('react');
    const z = require('zod').z;
    const h = React.createElement;
    const pkg = 'dsh-plugin-companion-windows-check';
    const service = 'companionWindowsCheck';
    const panel = 'companion-windows-check';
    const title = 'Windows 桌宠验收';
    const contribution = {
      package: pkg,
      descriptors: ['status', 'run'].map(method => ({
        id: pkg + '#' + service + '/' + method,
        service,
        namespace: service,
        method,
        invocation: {kind: 'direct'},
        parameters: [],
        result: {mode: 'strict', typeSymbol: pkg + '#' + method + ':result', create: () => z.json()},
      })),
    };

    return {
      apply(ctx) {
        ctx.inject(['slots', 'remote', 'layout'], async ctx => {
          await ctx.remote.$mount(contribution);
          ctx.inject(['remote.' + service], ctx => {
            const call = async method => {
              const reply = await ctx.remote[service][method]();
              if (!reply.ok) throw new Error(reply.error?.message || 'CHECK_REQUEST_FAILED');
              return reply.value;
            };
            function Page() {
              const [status, setStatus] = React.useState(null);
              const [busy, setBusy] = React.useState(false);
              const [result, setResult] = React.useState(null);
              React.useEffect(() => {
                let active = true;
                void call('status').then(value => {
                  if (active) setStatus(value);
                }).catch(() => {
                  if (active) setResult({passed: false, error: 'CHECK_STATUS_UNAVAILABLE'});
                });
                return () => { active = false; };
              }, []);
              async function run() {
                setBusy(true);
                setResult(null);
                try {
                  setResult(await call('run'));
                } catch {
                  setResult({passed: false, error: 'CHECK_REQUEST_FAILED'});
                } finally {
                  setBusy(false);
                }
              }
              return h('section', {style: {padding: 24, maxWidth: 680, lineHeight: 1.55}},
                h('h1', null, title),
                h('p', null, '桌宠出现后会自动缩小。可以点一下角色，并观察边缘、缩放和退出。'),
                status && h('p', {role: 'status'}, status.supported ? 'Windows x64 · 可以开始' : '需要 Windows x64'),
                h('button', {type: 'button', disabled: !status?.supported || busy, onClick: run},
                  busy ? '正在验证…' : '开始桌宠验证'),
                result && h('div', {role: 'status'},
                  h('p', null, result.passed ? '自动检查通过' : '自动检查未通过'),
                  h('pre', {style: {whiteSpace: 'pre-wrap'}}, JSON.stringify(result, null, 2))));
            }

            function Icon({size = 20}) {
              return h('svg', {viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true},
                h('path', {d: 'M4 5h16v11H4zM8 20h8m-4-4v4', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8}));
            }
            ctx.slots.inject('main', () => ctx.slots.register({name: 'main', key: panel}, Page));
            ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
              name: 'sidebar.panellist', id: panel, order: 10, label: () => title,
            }, Icon));
          });
        });
      },
    };
  },
});
