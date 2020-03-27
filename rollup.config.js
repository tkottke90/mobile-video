import nodeResolve from 'rollup-plugin-node-resolve';
import serve from 'rollup-plugin-server'

export default {
    input: ['src/index.js'],
    output: {
        format: 'esm',
        dir: 'dist/assets',
        sourcemap: true
    },
    plugins: [
        nodeResolve(),
        serve('dist')
    ]
}