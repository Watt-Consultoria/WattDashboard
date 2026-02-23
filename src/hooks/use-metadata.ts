'use client';

import * as React from 'react';

type UseMetadataParams = {
  title: string;
};

export default function useMetadata({ title }: UseMetadataParams) {
  React.useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
