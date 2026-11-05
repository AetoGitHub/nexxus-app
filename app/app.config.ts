export default defineAppConfig({
  ui: {
    colors: {
      primary: 'teal',
      neutral: 'neutral',
    },
    card: {
      variants: {
        variant: {
          solid: {
            root: 'bg-primary-500',
          },
        },
      },
    },
    // Móvil: ningún botón baja de 40 px de alto (objetivo táctil); en escritorio no cambia nada.
    button: {
      slots: {
        base: 'pointer-coarse:min-h-10',
      },
    },
    pageCard: {
      slots: {
        container: 'overflow-x-auto',
      },
    },
  },
});
