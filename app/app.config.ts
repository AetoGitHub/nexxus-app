export default defineAppConfig({
  ui: {
    colors: {
      // Paleta propia (main.css, @theme static): el teal exacto de la maqueta UX-04.
      primary: 'aeto',
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
