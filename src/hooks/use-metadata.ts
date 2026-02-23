import React from 'react';

export default function useMetadata(metadata: { title: string }) {
  /**
   * Hook para atualizar o título da página no client.
   * @param metadata Objeto com o título da página.
   */

  React.useEffect(() => {
    document.title = metadata.title;
  }, [metadata.title]);
}
