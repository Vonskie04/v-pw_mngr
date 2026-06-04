// @vitest-environment jsdom

import { beforeEach, describe, it, expect, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from '../../App.vue'

function createStorageMock() {
  const store = new Map()

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: createStorageMock(),
  })
}

describe('App password generator', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders and generates passwords with selected length', async () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Password Generator')
    expect(wrapper.find('.password-box').text().trim()).toHaveLength(16)

    await wrapper.get('#pw-length').setValue('24')
    await wrapper.get('button.generate').trigger('click')

    expect(wrapper.find('.password-box').text().trim()).toHaveLength(24)
  })

  it('saves generated password with label tag and note, then deletes it', async () => {
    const wrapper = mount(App)

    await wrapper.get('#entry-tag').setValue('Email')
    await wrapper.get('#entry-note').setValue('Main account login')
    await wrapper.get('button.save').trigger('click')

    const entries = wrapper.findAll('.entry')
    expect(entries).toHaveLength(1)
    expect(entries[0].find('.entry-tag').text()).toBe('Email')
    expect(entries[0].find('.entry-password').text().trim()).toHaveLength(16)
    expect(entries[0].find('.entry-note').text()).toBe('Main account login')

    expect(wrapper.get('#entry-tag').element.value).toBe('')
    expect(wrapper.get('#entry-note').element.value).toBe('')

    await entries[0].get('button.delete-entry').trigger('click')
    expect(wrapper.findAll('.entry')).toHaveLength(0)
  })

  it('uses Untitled when label tag is empty', async () => {
    const wrapper = mount(App)

    await wrapper.get('button.save').trigger('click')

    expect(wrapper.get('.entry-tag').text()).toBe('Untitled')
  })

  it('copies only saved password text to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const wrapper = mount(App)

    await wrapper.get('#entry-tag').setValue('Github')
    await wrapper.get('#entry-note').setValue('Personal account')
    await wrapper.get('button.save').trigger('click')
    await wrapper.get('button.copy-entry').trigger('click')

    expect(writeText).toHaveBeenCalledTimes(1)
    const savedPassword = wrapper.get('.entry-password').text()
    expect(writeText.mock.calls[0][0]).toBe(savedPassword)
  })

  it('loads saved entries from localStorage on mount', async () => {
    localStorage.setItem(
      'password-notepad-entries-v1',
      JSON.stringify([
        {
          id: 101,
          tag: 'Stored Entry',
          password: 'Abc123!@#',
          note: 'Loaded from storage',
        },
      ]),
    )

    const wrapper = mount(App)
    await nextTick()

    expect(wrapper.get('.entry-tag').text()).toBe('Stored Entry')
    expect(wrapper.get('.entry-password').text()).toBe('Abc123!@#')
    expect(wrapper.get('.entry-note').text()).toBe('Loaded from storage')
  })
})
