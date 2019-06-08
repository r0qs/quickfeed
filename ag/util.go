package ag

// RemoveRemoteID removes references to user's remote identity before transmitting user information over http
func (u *User) RemoveRemoteID() {
	voidIDs := make([]*RemoteIdentity, 0)
	u.RemoteIdentities = voidIDs
}

// RemoveRemoteIDs nullifies remote identities of all users
func (u *Users) RemoveRemoteIDs() {
	for _, user := range u.GetUsers() {
		user.RemoveRemoteID()
	}
}

// RemoveRemoteIDs nullifies remote identities of all users in a group
func (g *Group) RemoveRemoteIDs() {
	for _, user := range g.GetUsers() {
		user.RemoveRemoteID()
	}
}

// RemoveRemoteIDs nullifies remote identities of all users in every group
func (g *Groups) RemoveRemoteIDs() {
	for _, group := range g.GetGroups() {
		group.RemoveRemoteIDs()
	}
}