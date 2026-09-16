package com.example.smartparkingoperator.data.remote

import com.example.smartparkingoperator.data.remote.dto.ActiveSessionDto
import com.example.smartparkingoperator.data.remote.dto.AvailabilityDto
import com.example.smartparkingoperator.data.remote.dto.EntryRequestDto
import com.example.smartparkingoperator.data.remote.dto.EntryResponseDto
import com.example.smartparkingoperator.data.remote.dto.ExitRequestDto
import com.example.smartparkingoperator.data.remote.dto.ExitResponseDto
import com.example.smartparkingoperator.data.remote.dto.LocationAssignmentDto
import com.example.smartparkingoperator.data.remote.dto.LoginRequest
import com.example.smartparkingoperator.data.remote.dto.LoginResponse
import com.example.smartparkingoperator.data.remote.dto.RateDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    @POST("/api/v1/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    @GET("/api/v1/me/assignment")
    suspend fun getAssignedLocation(): Response<LocationAssignmentDto>

    @GET("/api/v1/locations/{id}/availability")
    suspend fun getSlotAvailability(
        @Path("id") locationId: String
    ): Response<AvailabilityDto>

    @GET("/api/v1/sessions")
    suspend fun getActiveSessions(
        @Query("status") status: String = "ACTIVE",
        @Query("location_id") locationId: String
    ): Response<List<ActiveSessionDto>>

    @GET("/api/v1/rates")
    suspend fun getRates(): Response<List<RateDto>>

    @POST("/api/v1/entries")
    suspend fun postEntry(
        @Body request: EntryRequestDto
    ): Response<EntryResponseDto>

    @POST("/api/v1/exits")
    suspend fun postExit(
        @Body request: ExitRequestDto
    ): Response<ExitResponseDto>
}
