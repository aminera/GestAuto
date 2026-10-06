<template>
  <div class="flex min-h-full items-center justify-center bg-linear-to-br from-slate-900 to-brand-700 p-4">
    <form class="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-xl" @submit.prevent="submit">
      <div class="mb-2 flex items-center gap-2">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white"><AppIcon name="car" /></div>
        <div>
          <h1 class="text-xl font-semibold">GestAuto</h1>
          <p class="text-sm text-slate-500">Gestion de flotte automobile</p>
        </div>
      </div>
      <FormField v-model="email" :field="{ name: 'email', label: 'E-mail', type: 'email', required: true }" />
      <FormField v-model="password" :field="{ name: 'password', label: 'Mot de passe', type: 'password', required: true }" />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <AppButton type="submit" class="w-full" :loading="loading">Se connecter</AppButton>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppButton from '@/components/ui/AppButton.vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import FormField from '@/components/ui/FormField.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    await auth.login(email.value, password.value);
    router.push(route.query.redirect || '/');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
