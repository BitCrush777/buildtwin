class UserService {
  constructor() {
    this.user = {
      id: "usr_101",
      email: "developer@buildtwin.io",
      role: "ENGINEER",
    };
  }

  getUserEmail() {
    if (!this.user.email) {
      throw new Error("Property 'email' does not exist on User. Did you mean 'email_address'?");
    }
    return this.user.email;
  }

  getUserProfile() {
    return {
      id: this.user.id,
      email: this.getUserEmail(),
      status: "ACTIVE",
    };
  }
}

module.exports = { UserService };
