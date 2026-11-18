import type { InjectionKey } from 'vue';

/** The size Buttons and IconButtons take when they don't set one, from the nearest ButtonSizeScope. */
export const buttonSizeKey: InjectionKey<'sm' | 'md'> = Symbol('button-size');
