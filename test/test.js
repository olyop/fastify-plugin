'use strict'

const t = require('tap')
const proxyquire = require('proxyquire')
const test = t.test
const fp = require('../plugin')
const Fastify = require('fastify')

test('fastify-plugin is a function', t => {
  t.plan(1)
  t.type(fp, 'function')
})

test('should return the function with the skip-override Symbol', t => {
  t.plan(1)

  function plugin (fastify, opts, next) {
    next()
  }

  fp(plugin)
  t.ok(plugin[Symbol.for('skip-override')])
})

test('should support "default" function from babel module', t => {
  t.plan(1)

  const plugin = {
    default: () => { }
  }

  try {
    fp(plugin)
    t.pass()
  } catch (e) {
    t.equal(e.message, 'fastify-plugin expects a function, instead got a \'object\'')
  }
})

test('should throw if the plugin is not a function', t => {
  t.plan(1)

  try {
    fp('plugin')
    t.fail()
  } catch (e) {
    t.equal(e.message, 'fastify-plugin expects a function, instead got a \'string\'')
  }
})

test('should check the fastify version', t => {
  t.plan(1)

  function plugin (fastify, opts, next) {
    next()
  }

  try {
    fp(plugin, { fastify: '>=0.10.0' })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('should check the fastify version', t => {
  t.plan(1)

  function plugin (fastify, opts, next) {
    next()
  }

  try {
    fp(plugin, '>=0.10.0')
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('the options object should be an object', t => {
  t.plan(2)

  try {
    fp(() => { }, null)
    t.fail()
  } catch (e) {
    t.equal(e.message, 'The options object should be an object')
  }

  try {
    fp(() => { }, [])
    t.fail()
  } catch (e) {
    t.equal(e.message, 'The options object should be an object')
  }
})

test('should throw if the version number is not a string', t => {
  t.plan(1)

  try {
    fp(() => { }, { fastify: 12 })
    t.fail()
  } catch (e) {
    t.equal(e.message, 'fastify-plugin expects a version string, instead got \'number\'')
  }
})

test('Should accept an option object', t => {
  t.plan(2)

  const opts = { hello: 'world' }

  function plugin (fastify, opts, next) {
    next()
  }

  fp(plugin, opts)
  t.ok(plugin[Symbol.for('skip-override')])
  t.same(plugin[Symbol.for('plugin-meta')], opts)
})

test('Should accept an option object and checks the version', t => {
  t.plan(2)

  const opts = { hello: 'world', fastify: '>=0.10.0' }

  function plugin (fastify, opts, next) {
    next()
  }

  fp(plugin, opts)
  t.ok(plugin[Symbol.for('skip-override')])
  t.same(plugin[Symbol.for('plugin-meta')], opts)
})

test('should set anonymous function name to file it was called from with a counter', t => {
  const fp = proxyquire('../plugin.js', { stubs: {} })

  const fn = fp((fastify, opts, next) => {
    next()
  })

  t.equal(fn[Symbol.for('plugin-meta')].name, 'test-auto-0')
  t.equal(fn[Symbol.for('fastify.display-name')], 'test-auto-0')

  const fn2 = fp((fastify, opts, next) => {
    next()
  })

  t.equal(fn2[Symbol.for('plugin-meta')].name, 'test-auto-1')
  t.equal(fn2[Symbol.for('fastify.display-name')], 'test-auto-1')

  t.end()
})

test('should set display-name to meta name', t => {
  t.plan(2)

  const functionName = 'superDuperSpecialFunction'

  const fn = fp((fastify, opts, next) => next(), {
    name: functionName
  })

  t.equal(fn[Symbol.for('plugin-meta')].name, functionName)
  t.equal(fn[Symbol.for('fastify.display-name')], functionName)
})

test('should preserve fastify version in meta', t => {
  t.plan(1)

  const opts = { hello: 'world', fastify: '>=0.10.0' }

  const fn = fp((fastify, opts, next) => next(), opts)

  t.equal(fn[Symbol.for('plugin-meta')].fastify, '>=0.10.0')
})

test('should check fastify dependency graph - plugin', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register(fp((fastify, opts, next) => next(), {
    fastify: '4.x',
    name: 'plugin1-name'
  }))

  fastify.register(fp((fastify, opts, next) => next(), {
    fastify: '4.x',
    name: 'test',
    dependencies: ['plugin1-name', 'plugin2-name']
  }))

  fastify.ready(err => {
    t.equal(err.message, "The dependency 'plugin2-name' of plugin 'test' is not registered")
  })
})

test('should check fastify dependency graph - decorate', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.decorate('plugin1', fp((fastify, opts, next) => next(), {
    fastify: '4.x',
    name: 'plugin1-name'
  }))

  fastify.register(fp((fastify, opts, next) => next(), {
    fastify: '4.x',
    name: 'test',
    decorators: { fastify: ['plugin1', 'plugin2'] }
  }))

  fastify.ready(err => {
    t.equal(err.message, "The decorator 'plugin2' required by 'test' is not present in Fastify")
  })
})

test('should check fastify dependency graph - decorateReply', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.decorateReply('plugin1', fp((fastify, opts, next) => next(), {
    fastify: '4.x',
    name: 'plugin1-name'
  }))

  fastify.register(fp((fastify, opts, next) => next(), {
    fastify: '4.x',
    name: 'test',
    decorators: { reply: ['plugin1', 'plugin2'] }
  }))

  fastify.ready(err => {
    t.equal(err.message, "The decorator 'plugin2' required by 'test' is not present in Reply")
  })
})
