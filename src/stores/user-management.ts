import { defineStore } from "pinia";
import { useConfigStore } from "@/stores/config.ts";
import type { DataResponse, CCFUser } from "@/stores/types.ts";

export const useUserManagementStore = defineStore("user-management", () => {
  const configStore = useConfigStore();

  async function getUser(id: string): Promise<DataResponse<CCFUser>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/users/${id}`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw response;
    }
    return (await response.json()) as DataResponse<CCFUser>;
  }

  async function listUsers(): Promise<DataResponse<CCFUser[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/users`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw response;
    }
    return (await response.json()) as DataResponse<CCFUser[]>;
  }

  async function updateUser(
    id: string,
    user: CCFUser
  ): Promise<DataResponse<CCFUser>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
      credentials: "include",
    });
    if (!response.ok) {
      throw response
    }
    return (await response.json()) as DataResponse<CCFUser>;
  }

  async function deleteUser(id: string): Promise<void> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/users/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      throw response;
    }
  }

  async function createUser(user: CCFUser): Promise<DataResponse<CCFUser>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
      credentials: "include",
    });
    if (!response.ok) {
      throw response;
    }
    return (await response.json()) as DataResponse<CCFUser>;
  }

  return { getUser, listUsers, updateUser, deleteUser, createUser };
});
