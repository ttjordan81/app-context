<template>
  <div class="container">
    <h1>Mini Brain Demo</h1>
    <p class="muted">
      Submit a form, generate sanitized request + domain events, then run the summarizer to produce agent context markdown.
    </p>

    <div class="grid">
      <div class="card">
        <h2>New submission</h2>

        <div style="display: grid; gap: 10px">
          <div>
            <label>Name</label>
            <input v-model.trim="form.name" placeholder="Jane Doe" />
          </div>

          <div>
            <label>Email</label>
            <input v-model.trim="form.email" placeholder="jane@example.com" />
          </div>

          <div>
            <label>Message</label>
            <textarea v-model.trim="form.message" placeholder="What are you building?" />
          </div>

          <div v-if="error" class="error">{{ error }}</div>

          <button :disabled="busy" @click="submit">{{ busy ? "Submitting…" : "Submit" }}</button>
        </div>
      </div>

      <div class="card">
        <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 10px">
          <h2>Submissions</h2>
          <button style="width: auto; padding: 10px 14px" :disabled="busy" @click="load">
            Refresh
          </button>
        </div>

        <p v-if="busy" class="muted">Loading…</p>
        <p v-else-if="items.length === 0" class="muted">No submissions yet.</p>

        <div class="list">
          <div v-for="s in items" :key="s.id" class="item">
            <h4>{{ s.name }} <span class="muted">({{ s.email }})</span></h4>
            <p>{{ s.message }}</p>
            <p class="muted" style="margin-top: 8px">{{ s.createdAt }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";

const items = ref([]);
const busy = ref(false);
const error = ref("");

const form = reactive({
  name: "",
  email: "",
  message: "",
});

async function load() {
  busy.value = true;
  error.value = "";
  try {
    const res = await fetch("/api/submissions");
    const data = await res.json();
    items.value = Array.isArray(data.submissions) ? data.submissions : [];
  } catch (e) {
    error.value = "Failed to load submissions.";
  } finally {
    busy.value = false;
  }
}

async function submit() {
  busy.value = true;
  error.value = "";
  try {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        message: form.message,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data && data.error) {
        error.value = data.error + (Array.isArray(data.missing) ? `: ${data.missing.join(", ")}` : "");
      } else {
        error.value = "Request failed.";
      }
      return;
    }

    form.name = "";
    form.email = "";
    form.message = "";

    await load();
  } catch (e) {
    error.value = "Request failed.";
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>
