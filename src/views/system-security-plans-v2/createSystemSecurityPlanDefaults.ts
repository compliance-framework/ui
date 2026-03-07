export interface CreateSystemSecurityPlanInput {
  uuid: string;
  title: string;
  version: string;
  remarks?: string;
}

export interface CreateSystemSecurityPlanPayload {
  uuid: string;
  metadata: {
    title: string;
    version: string;
    remarks?: string;
    props: [];
    links: [];
  };
  importProfile: {
    href: string;
  };
  systemCharacteristics: {
    systemIds: [];
    systemName: string;
    description: string;
    systemInformation: {
      informationTypes: [];
      props: [];
      links: [];
    };
    authorizationBoundary: ReturnType<typeof createEmptyDiagramSection>;
    networkArchitecture: ReturnType<typeof createEmptyDiagramSection>;
    dataFlow: ReturnType<typeof createEmptyDiagramSection>;
    props: [];
    links: [];
  };
  systemImplementation: {
    users: [];
    components: [];
    inventoryItems: [];
    leveragedAuthorizations: [];
    props: [];
    links: [];
  };
  controlImplementation: {
    description: string;
    setParameters: [];
    implementedRequirements: [];
  };
  backMatter: {
    resources: [];
  };
}

function createEmptyDiagramSection(uuid: string) {
  return {
    uuid,
    description: '',
    diagrams: [],
    props: [],
    links: [],
  };
}

export function createSystemSecurityPlanDefaults(
  input: CreateSystemSecurityPlanInput,
): CreateSystemSecurityPlanPayload {
  const remarks = input.remarks?.trim();

  return {
    uuid: input.uuid,
    metadata: {
      title: input.title,
      version: input.version,
      ...(remarks ? { remarks } : {}),
      props: [],
      links: [],
    },
    importProfile: {
      href: '',
    },
    systemCharacteristics: {
      systemIds: [],
      systemName: input.title,
      description: '',
      systemInformation: {
        informationTypes: [],
        props: [],
        links: [],
      },
      authorizationBoundary: createEmptyDiagramSection(crypto.randomUUID()),
      networkArchitecture: createEmptyDiagramSection(crypto.randomUUID()),
      dataFlow: createEmptyDiagramSection(crypto.randomUUID()),
      props: [],
      links: [],
    },
    systemImplementation: {
      users: [],
      components: [],
      inventoryItems: [],
      leveragedAuthorizations: [],
      props: [],
      links: [],
    },
    controlImplementation: {
      description: '',
      setParameters: [],
      implementedRequirements: [],
    },
    backMatter: {
      resources: [],
    },
  };
}
