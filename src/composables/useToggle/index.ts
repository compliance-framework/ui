import { ref } from 'vue';

export const useToggle = (initialValue = false) => {
  const value = ref<boolean>(initialValue);

  function toggle() {
    value.value = !value.value;
  }

  function set(newValue: boolean) {
    value.value = newValue;
  }

  function reset() {
    set(initialValue);
  }

  return {
    value,
    toggle,
    set,
    reset,
  };
};
