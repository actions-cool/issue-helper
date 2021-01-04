// more config: https://d.umijs.org/config
import { defineConfig } from 'dumi';

const name = 'issues-helper';

export default defineConfig({
  title: 'Issue Helper',
  mode: 'site',
  favicon:
    'https://avatars1.githubusercontent.com/u/73879334?s=200&v=4',
  logo:
    'https://avatars1.githubusercontent.com/u/73879334?s=200&v=4',
  exportStatic: {},
  ssr: {},
  outputPath: 'docs-dist',
  hash: true,
  base: `/${name}/`,
  publicPath: `/${name}/`,
  locales: [
    ['zh-CN', '中文'],
    ['en-US', 'English'],
  ],
  theme: {
    '@c-primary': '#42a5f5',
  },
  navs: {
    'zh-CN': [
      { title: '指 南', path: '/guide' },
      { title: '基 础', path: '/base' },
      { title: '进 阶', path: '/advanced' },
      { title: '更新日志', path: '/changelog' },
      { title: '国内镜像', path: 'https://issues-helper.gitee.io' },
      { title: 'GitHub', path: 'https://github.com/actions-cool/issues-helper' },
    ],
    'en-US': [
      { title: 'Guide', path: '/en-US/guide' },
      { title: 'Base', path: '/en-US/base' },
      { title: 'Advanced', path: '/en-US/advanced' },
      { title: 'Changelog', path: '/en-US/changelog' },
      { title: 'GitHub', path: 'https://github.com/actions-cool/issues-helper' },
    ]
  },
  menus: {
    '/guide': [
      {
        title: '🍭 介 绍',
        children: ['/guide/index', '/guide/start'],
      },
      {
        title: '🎁  参 考',
        path: '/guide/ref',
      },
      {
        title: '💬 FAQ',
        path: '/guide/faq',
      },
    ],
    '/en-US/guide': [
      {
        title: '🍭 Guide',
        children: ['/guide/index', '/guide/start'],
      },
      {
        title: '🎁  Reference',
        path: '/guide/ref',
      },
      {
        title: '💬 FAQ',
        path: '/guide/faq',
      },
    ],
  },
  styles: [
    `
      html {
        scroll-behavior: smooth;
      }
      .markdown table {
        width: auto !important;
      }
      .markdown table td:first-child {
        font-weight: normal !important;
      }
    `,
  ]
});
