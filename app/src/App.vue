<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const length = ref(16)
const includeUppercase = ref(true)
const includeLowercase = ref(true)
const includeNumbers = ref(true)
const includeSymbols = ref(true)

const generatedPassword = ref('')
const tagLabel = ref('')
const notepadNote = ref('')
const copyStatus = ref('')
const notepadStatus = ref('')
const storageKey = 'password-notepad-entries-v1'

const savedEntries = ref([])

const charset = computed(() => {
  let chars = ''

  if (includeUppercase.value) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (includeLowercase.value) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (includeNumbers.value) chars += '0123456789'
  if (includeSymbols.value) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  return chars
})

const canGenerate = computed(() => charset.value.length > 0)

function randomIndex(max) {
  if (window.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1)
    window.crypto.getRandomValues(buffer)
    return buffer[0] % max
  }

  return Math.floor(Math.random() * max)
}

function generatePassword() {
  if (!canGenerate.value) {
    generatedPassword.value = ''
    return
  }

  let password = ''
  for (let i = 0; i < length.value; i += 1) {
    const randomChar = charset.value[randomIndex(charset.value.length)]
    password += randomChar
  }

  generatedPassword.value = password
  copyStatus.value = ''
}

async function copyPassword() {
  if (!generatedPassword.value) return

  try {
    await navigator.clipboard.writeText(generatedPassword.value)
    copyStatus.value = 'Copied!'
  } catch {
    copyStatus.value = 'Clipboard blocked in this browser tab.'
  }
}

async function copySavedEntry(entry) {
  try {
    await navigator.clipboard.writeText(entry.password)
    notepadStatus.value = `Copied password for ${entry.tag}.`
  } catch {
    notepadStatus.value = 'Clipboard blocked in this browser tab.'
  }
}

function saveToNotepad() {
  if (!generatedPassword.value) return

  savedEntries.value.unshift({
    id: Date.now(),
    tag: tagLabel.value.trim() || 'Untitled',
    password: generatedPassword.value,
    note: notepadNote.value.trim(),
  })

  tagLabel.value = ''
  notepadNote.value = ''
  notepadStatus.value = ''
}

function removeEntry(id) {
  savedEntries.value = savedEntries.value.filter((entry) => entry.id !== id)
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return

    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      savedEntries.value = parsed
    }
  } catch {
    notepadStatus.value = 'Could not load saved notepad entries.'
  }
})

watch(
  savedEntries,
  (entries) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries))
    } catch {
      notepadStatus.value = 'Could not persist notepad entries.'
    }
  },
  { deep: true },
)

generatePassword()
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>Password Generator</h1>
      <p class="subtitle">Create strong passwords, add a label tag, and save them in your notepad.</p>

      <div class="password-row">
        <output class="password-box">{{ generatedPassword || 'Pick options and generate' }}</output>
        <button class="ghost copy-generated" @click="copyPassword">Copy</button>
      </div>
      <small class="status">{{ copyStatus }}</small>

      <div class="controls">
        <label for="pw-length">Length: {{ length }}</label>
        <input id="pw-length" v-model="length" type="range" min="8" max="64" />

        <label><input v-model="includeUppercase" type="checkbox" /> Uppercase (A-Z)</label>
        <label><input v-model="includeLowercase" type="checkbox" /> Lowercase (a-z)</label>
        <label><input v-model="includeNumbers" type="checkbox" /> Numbers (0-9)</label>
        <label><input v-model="includeSymbols" type="checkbox" /> Symbols (!@#$)</label>
      </div>

      <button class="generate" :disabled="!canGenerate" @click="generatePassword">Generate Password</button>
    </section>

    <section class="card notepad">
      <h2>Passwords Notepad</h2>

      <label for="entry-tag">Label Tag</label>
      <input
        id="entry-tag"
        v-model="tagLabel"
        type="text"
        placeholder="Example: Email, Bank, Work VPN"
      />

      <label for="entry-note">Note</label>
      <textarea
        id="entry-note"
        v-model="notepadNote"
        rows="3"
        placeholder="Optional note for this password"
      />

      <button class="save" :disabled="!generatedPassword" @click="saveToNotepad">Save Generated Password</button>
      <small class="status">{{ notepadStatus }}</small>

      <ul class="entries">
        <li v-for="entry in savedEntries" :key="entry.id" class="entry">
          <button
            class="ghost copy-entry"
            aria-label="Copy saved password"
            title="Copy saved password"
            @click="copySavedEntry(entry)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9 3h10a2 2 0 0 1 2 2v10h-2V5H9zM5 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm0 2v10h10V9z"
              />
            </svg>
          </button>
          <p class="entry-tag">{{ entry.tag }}</p>
          <p class="entry-password">{{ entry.password }}</p>
          <p v-if="entry.note" class="entry-note">{{ entry.note }}</p>
          <div class="entry-actions">
            <button class="ghost delete-entry" @click="removeEntry(entry.id)">Delete</button>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: radial-gradient(circle at 20% 20%, #f7f0ff 0%, #f1f7ff 35%, #eefbf7 100%);
  min-height: 100vh;
}

.page {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  padding: 1.25rem;
  max-width: 1100px;
  margin: 0 auto;
}

.card {
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid #c9d3e6;
  border-radius: 18px;
  padding: 1.1rem;
  box-shadow: 0 14px 40px rgba(10, 28, 56, 0.12);
}

h1,
h2 {
  margin: 0;
  color: #0f2b46;
}

.subtitle {
  margin: 0.45rem 0 1rem;
  color: #35536e;
}

.password-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.password-box {
  flex: 1;
  overflow: auto;
  white-space: nowrap;
  border: 1px solid #b9cbe2;
  border-radius: 12px;
  padding: 0.7rem;
  font-family: Consolas, monospace;
  color: #0b243c;
  background: #f9fbff;
}

.status {
  display: block;
  min-height: 1.1rem;
  color: #2e5f2f;
  margin-top: 0.25rem;
}

.controls {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.85rem;
}

label {
  color: #24425e;
  font-weight: 600;
  display: block;
}

input[type='text'],
textarea {
  width: 100%;
  box-sizing: border-box;
  margin-top: 0.2rem;
  border: 1px solid #afc5df;
  border-radius: 10px;
  padding: 0.65rem 0.7rem;
  font: inherit;
  color: #17324a;
  background: #fcfeff;
}

input[type='range'] {
  width: 100%;
}

button {
  border: none;
  border-radius: 10px;
  padding: 0.65rem 0.95rem;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.generate,
.save {
  margin-top: 0.85rem;
  background: linear-gradient(135deg, #0f7f67, #1676a5);
  color: #ffffff;
}

.ghost {
  background: #e3ecf9;
  color: #11395f;
}

.entries {
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.6rem;
}

.entry {
  position: relative;
  border: 1px solid #c4d3e7;
  border-radius: 12px;
  background: #fbfdff;
  padding: 0.7rem;
  padding-right: 3rem;
}

.entry-tag {
  margin: 0;
  font-weight: 800;
  color: #143a59;
}

.entry-password {
  margin: 0.35rem 0;
  font-family: Consolas, monospace;
  color: #133554;
}

.entry-note {
  margin: 0 0 0.5rem;
  color: #42627c;
}

.entry-actions {
  display: flex;
  gap: 0.45rem;
  margin-top: 0.3rem;
}

.copy-entry {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.copy-entry svg {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}

@media (max-width: 540px) {
  .password-row {
    flex-direction: column;
  }

  .ghost {
    width: 100%;
  }

  .copy-entry {
    width: 2rem;
  }
}
</style>
