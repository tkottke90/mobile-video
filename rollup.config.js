import nodeResolve from 'rollup-plugin-node-resolve';

export default {
    input: ['src/index.js'],
    output: {
        format: 'esm',
        dir: 'dist/assets',
        sourcemap: true
    },
    plugins: [
        nodeResolve()
    ]
}